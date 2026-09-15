import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      equipmentId,
      startDate,
      endDate,
      notes,
      deliveryAddress,
      paymentMethod,
      waiverAccepted,
    } = body;

    const allowedPaymentMethods = ["MOBILE_MONEY", "CARD", "BANK_TRANSFER"];
    const safePaymentMethod = allowedPaymentMethods.includes(paymentMethod)
      ? paymentMethod
      : "MOBILE_MONEY";

    if (!equipmentId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (waiverAccepted !== true) {
      return NextResponse.json(
        { error: "You must accept the liability waiver to book" },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    if (!equipment.isAvailable) {
      return NextResponse.json(
        { error: "This equipment is not currently available for booking" },
        { status: 409 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (totalDays < equipment.minHireDays) {
      return NextResponse.json(
        { error: `Minimum hire is ${equipment.minHireDays} days` },
        { status: 400 }
      );
    }

    const subtotal = equipment.pricePerDay * totalDays;
    const commissionAmount = subtotal * 0.1; // 10% commission
    const totalPrice = subtotal + commissionAmount;

    // Re-check for overlaps and create the booking + its escrow payment record
    // atomically so a concurrent request can't double-book the same equipment.
    const booking = await prisma.$transaction(async (tx) => {
      const conflicting = await tx.booking.findFirst({
        where: {
          equipmentId,
          status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
          startDate: { lt: end },
          endDate: { gt: start },
        },
      });

      if (conflicting) {
        throw new Error("BOOKING_CONFLICT");
      }

      return tx.booking.create({
        data: {
          equipmentId,
          clientId: user.id,
          startDate: start,
          endDate: end,
          totalDays,
          subtotal,
          commissionAmount,
          totalPrice,
          notes: notes || null,
          deliveryAddress: deliveryAddress || null,
          waiverAcceptedAt: new Date(),
          payment: {
            create: {
              amount: totalPrice,
              method: safePaymentMethod,
              status: "PENDING",
            },
          },
        },
        include: {
          equipment: true,
          client: true,
          payment: true,
        },
      });
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_CONFLICT") {
      return NextResponse.json(
        { error: "Equipment is already booked for part of this date range" },
        { status: 409 }
      );
    }
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const asOwner = request.nextUrl.searchParams.get("as") === "owner";

    const bookings = await prisma.booking.findMany({
      where: asOwner
        ? { equipment: { ownerId: user.id } }
        : { clientId: user.id },
      include: {
        equipment: {
          include: {
            owner: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        },
        client: {
          select: { name: true, email: true, phone: true },
        },
        payment: true,
        review: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
