import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { verifyBvn } from "@/lib/youverify";
import { recomputeVerifiedBadge } from "@/lib/kyc";

const schema = z.object({ bvn: z.string().length(11) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "BVN must be 11 digits" }, { status: 400 });
  }

  try {
    const { users } = await getCollections();
    const userId = new ObjectId(session.user.id);

    if (
      await users.findOne({ "bvn.value": parsed.data.bvn, "bvn.status": "verified", _id: { $ne: userId } })
    ) {
      return NextResponse.json(
        { error: "This BVN is already linked to another Reallow account" },
        { status: 409 },
      );
    }

    const result = await verifyBvn(parsed.data.bvn);

    await users.updateOne(
      { _id: userId },
      {
        $set: {
          "bvn.status": result.success ? "verified" : "failed",
          "bvn.provider": "youverify",
          ...(result.success ? { "bvn.verifiedAt": new Date(), "bvn.value": parsed.data.bvn } : {}),
          updatedAt: new Date(),
        },
      },
    );
    const verifiedBadge = await recomputeVerifiedBadge(userId);

    return NextResponse.json({ success: result.success, message: result.message, verifiedBadge });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
