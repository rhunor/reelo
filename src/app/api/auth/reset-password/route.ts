import { NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCollections } from "@/lib/db";
import { sendPasswordChangedEmail } from "@/lib/email";
import { consumePasswordReset, findPasswordReset } from "@/lib/login-codes";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";
import { forgetAccount } from "@/auth";

const schema = z
  .object({
    token: z.string().min(20),
    password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

// GET ?token= — is this reset link still valid? (The page shows a friendly message if not.)
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const user = token ? await findPasswordReset(token) : null;
  return NextResponse.json({ valid: Boolean(user) });
}

// POST — set the new password. The link is used up in the same step.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  }
  const userId = await consumePasswordReset(parsed.data.token, await bcrypt.hash(parsed.data.password, 12));
  if (!userId) {
    return NextResponse.json({ error: "expired", code: "expired" }, { status: 410 });
  }
  forgetAccount(userId.toString());

  const { users } = await getCollections();
  const user = await users.findOne({ _id: userId }, { projection: { email: 1, name: 1, firstName: 1 } });
  if (user) after(() => sendPasswordChangedEmail(user.email, user.firstName ?? user.name));
  return NextResponse.json({ success: true });
}
