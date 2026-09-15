import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { getListingLimit } from "@/lib/subscription";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [ownerProfile, listingCount] = await Promise.all([
      prisma.ownerProfile.findUnique({ where: { userId: user.id } }),
      prisma.equipment.count({ where: { ownerId: user.id } }),
    ]);

    const subscriptionTier = ownerProfile?.subscriptionTier ?? "FREE";
    const listingLimit = getListingLimit(subscriptionTier);

    return NextResponse.json({
      subscriptionTier,
      listingCount,
      listingLimit: Number.isFinite(listingLimit) ? listingLimit : null,
    });
  } catch (error) {
    console.error("Error fetching owner profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch owner profile" },
      { status: 500 }
    );
  }
}
