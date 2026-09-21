import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUploadSignature } from "@/lib/cloudinary";
import { isStaffRole } from "@/lib/roles";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defaults to "listing" so existing callers (photo/video uploaders, which send no
  // body) keep working unchanged. Only support accounts are blocked from listing
  // uploads — anyone else can list a property now — while a profile picture is
  // something any authenticated user can upload.
  const body = await request.json().catch(() => ({}));
  const purpose = body?.purpose === "profile" ? "profile" : "listing";

  if (purpose === "listing" && session.user.role === "support") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folder =
      purpose === "profile"
        ? `reallow/profiles/${session.user.id}`
        : `reallow/listings/${session.user.id}`;
    const signature = createUploadSignature(folder);
    return NextResponse.json(signature);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
