import { NextResponse } from "next/server";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "New passwords don't match" })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from your current one",
  });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  await users.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), updatedAt: new Date() } },
  );
  return NextResponse.json({ success: true });
}
