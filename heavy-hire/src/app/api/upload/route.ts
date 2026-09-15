import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { createPresignedUploadUrl } from "@/lib/storage";
import { uploadRequestSchema } from "@/lib/validation";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = uploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { purpose, contentType } = parsed.data;

    // Equipment photos: owners/admins only (tied to listing creation).
    // Booking pickup/return photos: owners only (only they transition booking status).
    // Verification (ID) documents: any authenticated user.
    if (purpose === "equipment" && user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (purpose === "booking-photo" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const folder =
      purpose === "verification"
        ? "verification"
        : purpose === "booking-photo"
        ? "bookings"
        : "equipment";

    const ext = EXTENSIONS[contentType];
    const key = `${folder}/${user.id}/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await createPresignedUploadUrl({
      key,
      contentType: parsed.data.contentType,
    });

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("Error creating upload URL:", error);
    const message =
      error instanceof Error && error.message === "R2 storage is not configured"
        ? "Image uploads are not configured yet"
        : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
