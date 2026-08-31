import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCollections } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["tenant", "landlord"]),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;
  const { users } = await getCollections();

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await users.insertOne({
    role,
    name,
    email: email.toLowerCase(),
    passwordHash,
    nin: { status: "unverified" },
    verifiedBadge: false,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true });
}
