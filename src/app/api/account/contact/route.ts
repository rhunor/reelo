import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { generateEmailVerificationToken, sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  alternatePhone: z.string().trim().max(20).optional(),
  // Required only when the email changes — it's the login identifier.
  currentPassword: z.string().optional(),
});

// Same uniqueness rules as signup: no two accounts share an email or a phone number.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, phone, currentPassword } = parsed.data;
  const alternatePhone = parsed.data.alternatePhone || undefined;
  if (alternatePhone && alternatePhone === phone) {
    return NextResponse.json({ error: "Alternative number must be different from your main number" }, { status: 400 });
  }

  const { users } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const user = await users.findOne({ _id: userId });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const emailChanged = email !== user.email;
  if (emailChanged) {
    if (!currentPassword || !user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Enter your current password to change your email" }, { status: 400 });
    }
    if (await users.findOne({ email, _id: { $ne: userId } })) {
      return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
    }
  }
  if (phone !== user.phone && (await users.findOne({ phone, _id: { $ne: userId } }))) {
    return NextResponse.json({ error: "That phone number is already registered" }, { status: 409 });
  }

  const now = new Date();
  const update: Record<string, unknown> = { phone, updatedAt: now };
  const unset: Record<string, ""> = {};
  if (alternatePhone) update.alternatePhone = alternatePhone;
  else unset.alternatePhone = "";

  if (emailChanged) {
    // A new address has to be verified again, exactly like at signup.
    const { token, expiresAt } = generateEmailVerificationToken();
    Object.assign(update, {
      email,
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiresAt: expiresAt,
    });
    await users.updateOne({ _id: userId }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    await sendVerificationEmail(email, token);
  } else {
    await users.updateOne({ _id: userId }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  }

  return NextResponse.json({ success: true, emailChanged });
}
