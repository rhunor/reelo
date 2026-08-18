import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z.object({
  occupation: z.string().max(100).optional(),
  employer: z.string().max(100).optional(),
  monthlyIncomeNGN: z.coerce.number().nonnegative().optional(),
  householdSize: z.coerce.number().int().positive().optional(),
  hasPets: z.boolean().optional(),
  aboutMe: z.string().max(500).optional(),
  visibleToLandlords: z.boolean(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { users } = await getCollections();

  await users.updateOne(
    { _id: new ObjectId(session.user.id) },
    {
      $set: {
        tenantProfile: parsed.data,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ success: true });
}
