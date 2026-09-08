import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

// Role-agnostic — both tenants and landlords fill this in. Deliberately separate from
// tenantProfile (which is scoped to sharing background info with a specific landlord):
// this is about who this user is, for KYC/payout purposes.
const schema = z.object({
  occupation: z.string().max(100).optional(),
  maritalStatus: z.string().max(50).optional(),
  religion: z.string().max(50).optional(),
  profilePictureUrl: z.string().url().optional(),
  occupationVisible: z.boolean().optional(),
  maritalStatusVisible: z.boolean().optional(),
  religionVisible: z.boolean().optional(),
  profilePictureVisible: z.boolean().optional(),
  // Bank details are never exposed via any visibility toggle — collected purely for
  // name-matching before Reallow ever pays this user out.
  bankAccountName: z.string().max(200).optional(),
  bankAccountNumber: z.string().max(20).optional(),
  bankName: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { users } = await getCollections();
  const data = parsed.data;

  await users.updateOne(
    { _id: new ObjectId(session.user.id) },
    {
      $set: {
        profile: {
          occupation: data.occupation,
          maritalStatus: data.maritalStatus,
          religion: data.religion,
          profilePictureUrl: data.profilePictureUrl,
          occupationVisible: data.occupationVisible ?? false,
          maritalStatusVisible: data.maritalStatusVisible ?? false,
          religionVisible: data.religionVisible ?? false,
          profilePictureVisible: data.profilePictureVisible ?? false,
        },
        bankDetails: {
          accountName: data.bankAccountName,
          accountNumber: data.bankAccountNumber,
          bankName: data.bankName,
        },
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ success: true });
}
