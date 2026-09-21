import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCollections } from "@/lib/db";
import { generateEmailVerificationToken, sendVerificationEmail } from "@/lib/email";
import { deriveRoleFromIntents } from "@/lib/intents";
import { generateReferralCode } from "@/lib/referrals";

// No human fills out this form in under 3 seconds — a submission that fast is almost
// certainly a bot that never actually rendered the page. Paired with the `website`
// honeypot check below; neither needs a third-party CAPTCHA key.
const MIN_SUBMIT_MS = 3000;

const registerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    otherNames: z.string().optional(),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    intents: z
      .array(z.enum(["renting_out", "selling", "renting", "buying", "prefer_not_to_say"]))
      .min(1),
    termsAccepted: z.union([z.literal("true"), z.literal(true)]),
    newsletterOptIn: z.union([z.literal("true"), z.literal(true), z.literal("false"), z.literal(false)]).optional(),
    website: z.string().optional(),
    formRenderedAt: z.number().optional(),
    ref: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Honeypot tripped, or submitted faster than a human could — reject with the same
  // generic error a real validation failure would give, so a bot learns nothing.
  if (parsed.data.website || (parsed.data.formRenderedAt && Date.now() - parsed.data.formRenderedAt < MIN_SUBMIT_MS)) {
    return NextResponse.json({ error: "Registration failed" }, { status: 400 });
  }

  const { firstName, lastName, otherNames, email, phone, password, intents, newsletterOptIn, ref } = parsed.data;
  // Recomputed server-side, not trusted from the client — this is what actually gates
  // dashboards/permissions, so it can't be whatever a tampered request claims it is.
  const role = deriveRoleFromIntents(intents);
  const name = [firstName, otherNames, lastName].filter(Boolean).join(" ");
  const { users } = await getCollections();

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  const existingPhone = await users.findOne({ phone });
  if (existingPhone) {
    return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const { token, expiresAt } = generateEmailVerificationToken();
  const referralCode = await generateReferralCode(firstName);

  // An invalid or missing ref code never blocks signup — it's silently ignored.
  const referrer = ref ? await users.findOne({ referralCode: ref }) : null;

  await users.insertOne({
    role,
    intents,
    name,
    firstName,
    lastName,
    otherNames,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    nin: { status: "unverified" },
    verifiedBadge: false,
    termsAcceptedAt: now,
    termsVersion: "2026-09-21",
    newsletterOptIn: newsletterOptIn === "false" || newsletterOptIn === false ? false : true,
    emailVerified: false,
    emailVerificationToken: token,
    emailVerificationTokenExpiresAt: expiresAt,
    referralCode,
    ...(referrer ? { referredBy: referrer._id } : {}),
    walletBalanceNGN: 0,
    createdAt: now,
    updatedAt: now,
  });

  await sendVerificationEmail(email.toLowerCase(), token);

  return NextResponse.json({ success: true });
}
