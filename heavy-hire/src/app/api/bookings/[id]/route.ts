import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { bookingTransitionSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        equipment: {
          include: {
            owner: true,
          },
        },
        client: true,
        payment: true,
        review: true,
        dispute: true,
        messages: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (booking.clientId !== user.id && booking.equipment.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { equipment: { select: { ownerId: true } }, payment: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isClient = booking.clientId === user.id;
    const isOwner = booking.equipment.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";

    const body = await request.json();
    const parsed = bookingTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Confirm, pickup, and complete are the owner's call -- they're the one
    // physically handing over and receiving the equipment back.
    if (parsed.data.action === "confirm" || parsed.data.action === "pickup" || parsed.data.action === "complete") {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Only the equipment owner can update booking status" },
          { status: 403 }
        );
      }
    } else if (parsed.data.action === "cancel") {
      // The client or owner can call off their own booking; admin can step in
      // for oversight even once it's already active.
      if (!isClient && !isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (parsed.data.action === "confirm") {
      if (booking.status !== "PENDING") {
        return NextResponse.json(
          { error: `Cannot confirm from status ${booking.status}` },
          { status: 409 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });

      return NextResponse.json(updated);
    }

    if (parsed.data.action === "pickup") {
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        return NextResponse.json(
          { error: `Cannot mark picked up from status ${booking.status}` },
          { status: 409 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "ACTIVE", pickupPhotos: parsed.data.photos },
      });

      return NextResponse.json(updated);
    }

    if (parsed.data.action === "complete") {
      if (booking.status !== "ACTIVE") {
        return NextResponse.json(
          { error: `Cannot mark returned from status ${booking.status}` },
          { status: 409 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "COMPLETED", returnPhotos: parsed.data.photos },
      });

      return NextResponse.json(updated);
    }

    // action === "cancel"
    const cancellableStatuses = isAdmin
      ? ["PENDING", "CONFIRMED", "ACTIVE"]
      : ["PENDING", "CONFIRMED"];

    if (!cancellableStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel from status ${booking.status}` },
        { status: 409 }
      );
    }

    const cancellationReason =
      parsed.data.action === "cancel" ? parsed.data.reason || null : null;

    const updated = await prisma.$transaction(async (tx) => {
      // Nothing has actually been collected until Payment reaches
      // HELD_ESCROW, so only a payment already held needs reversing.
      if (booking.payment && booking.payment.status === "HELD_ESCROW") {
        await tx.payment.update({
          where: { bookingId: id },
          data: { status: "REFUNDED" },
        });
      }

      return tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancellationReason,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
