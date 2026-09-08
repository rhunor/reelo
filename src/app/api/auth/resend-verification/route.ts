import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { ObjectId } from "mongodb";
import { generateEmailVerificationToken, sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  const { token, expiresAt } = generateEmailVerificationToken();
  await users.updateOne(
    { _id: user._id },
    { $set: { emailVerificationToken: token, emailVerificationTokenExpiresAt: expiresAt, updatedAt: new Date() } },
  );

  await sendVerificationEmail(user.email, token);

  return NextResponse.json({ success: true });
}
