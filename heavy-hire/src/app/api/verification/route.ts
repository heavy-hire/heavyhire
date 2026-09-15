import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { verificationSubmitSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isVerified: true, idDocumentUrl: true },
    });

    return NextResponse.json({
      isVerified: record?.isVerified ?? false,
      status: record?.isVerified
        ? "verified"
        : record?.idDocumentUrl
        ? "pending"
        : "not_submitted",
    });
  } catch (error) {
    console.error("Error fetching verification status:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verificationSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { idDocumentUrl: parsed.data.idDocumentUrl, isVerified: false },
    });

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Error submitting verification:", error);
    return NextResponse.json(
      { error: "Failed to submit verification" },
      { status: 500 }
    );
  }
}
