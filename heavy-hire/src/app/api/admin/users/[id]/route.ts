import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { adminUserUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = adminUserUpdateSchema.safeParse(body);

    if (!parsed.success || (parsed.data.verified === undefined && parsed.data.active === undefined)) {
      return NextResponse.json(
        { error: "Expected a boolean 'verified' and/or 'active' field" },
        { status: 400 }
      );
    }

    if (params.id === admin.id && parsed.data.active === false) {
      return NextResponse.json(
        { error: "You cannot suspend your own account" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    if (parsed.data.verified !== undefined) {
      Object.assign(
        data,
        parsed.data.verified
          ? { isVerified: true }
          : { isVerified: false, idDocumentUrl: null }
      );
    }

    if (parsed.data.active !== undefined) {
      data.isActive = parsed.data.active;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, isVerified: true, isActive: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
