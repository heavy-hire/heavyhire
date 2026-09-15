import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = request.nextUrl.searchParams.get("pending") === "true";

    if (!pending) {
      return NextResponse.json({ error: "Unsupported query" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { idDocumentUrl: { not: null }, isVerified: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        idDocumentUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending verifications" },
      { status: 500 }
    );
  }
}
