import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCollections } from "@/lib/db";
import { generateEmailVerificationToken, sendVerificationEmail } from "@/lib/email";

const registerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    otherNames: z.string().optional(),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    role: z.enum(["tenant", "landlord"]),
    termsAccepted: z.union([z.literal("true"), z.literal(true)]),
    newsletterOptIn: z.union([z.literal("true"), z.literal(true), z.literal("false"), z.literal(false)]).optional(),
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

  const { firstName, lastName, otherNames, email, phone, password, role, newsletterOptIn } = parsed.data;
  const name = [firstName, otherNames, lastName].filter(Boolean).join(" ");
  const { users } = await getCollections();

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const { token, expiresAt } = generateEmailVerificationToken();

  await users.insertOne({
    role,
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
    termsVersion: "draft-v1",
    newsletterOptIn: newsletterOptIn === "false" || newsletterOptIn === false ? false : true,
    emailVerified: false,
    emailVerificationToken: token,
    emailVerificationTokenExpiresAt: expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  await sendVerificationEmail(email.toLowerCase(), token);

  return NextResponse.json({ success: true });
}
