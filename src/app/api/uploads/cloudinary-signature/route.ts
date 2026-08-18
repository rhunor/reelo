import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUploadSignature } from "@/lib/cloudinary";

export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "landlord" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const signature = createUploadSignature(`reallow/listings/${session.user.id}`);
    return NextResponse.json(signature);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
