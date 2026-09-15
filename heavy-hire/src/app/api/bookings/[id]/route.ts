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
      include: { equipment: { select: { ownerId: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.equipment.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the equipment owner can update booking status" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = bookingTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, photos } = parsed.data;

    if (action === "pickup") {
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        return NextResponse.json(
          { error: `Cannot mark picked up from status ${booking.status}` },
          { status: 409 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "ACTIVE", pickupPhotos: photos },
      });

      return NextResponse.json(updated);
    }

    // action === "complete"
    if (booking.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Cannot mark returned from status ${booking.status}` },
        { status: 409 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "COMPLETED", returnPhotos: photos },
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
