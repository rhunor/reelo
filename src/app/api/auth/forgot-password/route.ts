import { NextResponse } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db";
import { appBaseUrl, sendPasswordResetEmail } from "@/lib/email";
import { issuePasswordReset, PASSWORD_RESET_MINUTES } from "@/lib/login-codes";

const schema = z.object({ email: z.string().email() });

// "Forgot password": email a one-use reset link. Always answers the same way, whether or not
// the email has an account, so it can't be used to find out who's registered.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  const { users } = await getCollections();
  const user = await users.findOne(
    { email: parsed.data.email.toLowerCase() },
    { projection: { email: 1, name: 1, firstName: 1, status: 1, passwordHash: 1 } },
  );
  if (user?.passwordHash && user.status !== "banned") {
    const token = await issuePasswordReset(user._id!);
    if (token) {
      await sendPasswordResetEmail(
        user.email,
        user.firstName ?? user.name,
        `${appBaseUrl()}/reset-password?token=${token}`,
        PASSWORD_RESET_MINUTES,
      );
    }
  }
  return NextResponse.json({ success: true });
}
