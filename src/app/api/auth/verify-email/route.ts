import { NextResponse } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const { users } = await getCollections();
  const user = await users.findOne({ emailVerificationToken: parsed.data.token });

  if (!user) {
    return NextResponse.json({ error: "This verification link is invalid or has already been used" }, { status: 404 });
  }
  if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link has expired — request a new one" }, { status: 410 });
  }

  await users.updateOne(
    { _id: user._id },
    {
      $set: { emailVerified: true, updatedAt: new Date() },
      $unset: { emailVerificationToken: "", emailVerificationTokenExpiresAt: "" },
    },
  );

  return NextResponse.json({ success: true });
}
