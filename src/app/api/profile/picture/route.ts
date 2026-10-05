import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

// Only accept images from our own Cloudinary account's profile folder for this user —
// the camera capture component uploads there via a signed request first.
const schema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const expectedPrefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (
    !parsed.success ||
    !parsed.data.url.startsWith(expectedPrefix) ||
    !parsed.data.url.includes(`/reallow/profiles/${session.user.id}/`)
  ) {
    return NextResponse.json({ error: "Invalid picture" }, { status: 400 });
  }

  const { users } = await getCollections();
  await users.updateOne(
    { _id: new ObjectId(session.user.id) },
    { $set: { "profile.profilePictureUrl": parsed.data.url, updatedAt: new Date() } },
  );
  return NextResponse.json({ success: true });
}
