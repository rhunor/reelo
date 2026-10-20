import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCollections } from "@/lib/db";
import { sendLoginCodeEmail } from "@/lib/email";
import { issueLoginCode, LOGIN_CODE_MINUTES, LOGIN_CODE_RESEND_SECONDS } from "@/lib/login-codes";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

const maskEmail = (email: string) => email.replace(/^(.)(.*)(@.*)$/, (_, a: string, b: string, c: string) => `${a}${"•".repeat(Math.min(b.length, 6))}${c}`);

// Step 1 of signing in: check the email and password, then email a one-time code. The code
// is entered on the login page and checked by the credentials provider (src/auth.ts).
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", code: "invalid" }, { status: 400 });

  const { users } = await getCollections();
  const user = await users.findOne({ email: parsed.data.email.toLowerCase() });
  // Same answer for an unknown email and a wrong password — don't reveal which accounts exist.
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid", code: "invalid" }, { status: 401 });
  }
  if (user.status === "banned") {
    return NextResponse.json({ error: "blocked", code: "account_blocked" }, { status: 403 });
  }

  const code = await issueLoginCode(user._id!);
  if (!code) {
    return NextResponse.json(
      { error: "wait", code: "wait", seconds: LOGIN_CODE_RESEND_SECONDS, sentTo: maskEmail(user.email) },
      { status: 429 },
    );
  }
  const sent = await sendLoginCodeEmail(user.email, user.firstName ?? user.name, code, LOGIN_CODE_MINUTES);
  // Without a working email service nobody could sign in — say so instead of failing silently.
  if (!sent && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "email_failed", code: "email_failed" }, { status: 502 });
  }
  return NextResponse.json({ success: true, sentTo: maskEmail(user.email), minutes: LOGIN_CODE_MINUTES });
}
