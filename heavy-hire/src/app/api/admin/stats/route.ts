import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      usersByRole,
      equipmentTotal,
      equipmentPending,
      equipmentByCategory,
      bookingsByStatus,
      revenue,
      openDisputes,
      recentBookings,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.equipment.count(),
      prisma.equipment.count({ where: { isApproved: false } }),
      prisma.equipment.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.booking.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { totalPrice: true, commissionAmount: true },
      }),
      prisma.dispute.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          equipment: { select: { title: true } },
          client: { select: { name: true } },
        },
      }),
    ]);

    const roleCounts = { CLIENT: 0, OWNER: 0, ADMIN: 0 } as Record<string, number>;
    for (const row of usersByRole) roleCounts[row.role] = row._count._all;

    const statusCounts: Record<string, number> = {};
    for (const row of bookingsByStatus) statusCounts[row.status] = row._count._all;

    const categoryCounts: Record<string, number> = {};
    for (const row of equipmentByCategory) categoryCounts[row.category] = row._count._all;

    return NextResponse.json({
      users: {
        total: roleCounts.CLIENT + roleCounts.OWNER + roleCounts.ADMIN,
        clients: roleCounts.CLIENT,
        owners: roleCounts.OWNER,
        admins: roleCounts.ADMIN,
      },
      equipment: {
        total: equipmentTotal,
        pendingApproval: equipmentPending,
        byCategory: categoryCounts,
      },
      bookings: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        byStatus: statusCounts,
      },
      revenue: {
        gmv: revenue._sum.totalPrice ?? 0,
        commission: revenue._sum.commissionAmount ?? 0,
      },
      openDisputes,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        equipmentTitle: b.equipment.title,
        clientName: b.client.name,
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
