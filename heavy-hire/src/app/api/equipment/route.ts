import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { equipmentCreateSchema } from "@/lib/validation";
import { getListingLimit } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");
    const mine = request.nextUrl.searchParams.get("owner") === "me";
    const pending = request.nextUrl.searchParams.get("pending") === "true";

    if (mine) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }

      const equipment = await prisma.equipment.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(equipment);
    }

    if (pending) {
      const user = await getCurrentUser();
      if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const equipment = await prisma.equipment.findMany({
        where: { isApproved: false },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json(equipment);
    }

    const where: any = {
      isApproved: true,
      isAvailable: true,
    };

    if (category) {
      where.category = category;
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only equipment owners can create listings" },
        { status: 403 }
      );
    }

    if (user.role === "OWNER") {
      const [ownerProfile, listingCount] = await Promise.all([
        prisma.ownerProfile.findUnique({ where: { userId: user.id } }),
        prisma.equipment.count({ where: { ownerId: user.id } }),
      ]);

      const tier = ownerProfile?.subscriptionTier ?? "FREE";
      const limit = getListingLimit(tier);

      if (listingCount >= limit) {
        return NextResponse.json(
          {
            error: `Your ${tier} plan allows up to ${limit} listings. Upgrade your subscription to add more.`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const parsed = equipmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.create({
      data: {
        ...parsed.data,
        ownerId: user.id,
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error("Error creating equipment:", error);
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
}
