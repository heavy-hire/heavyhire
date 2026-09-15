import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const bookings = await prisma.booking.findMany({
      where: {
        equipmentId: id,
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({
      bookedRanges: bookings.map((b) => ({
        from: b.startDate,
        to: b.endDate,
      })),
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
