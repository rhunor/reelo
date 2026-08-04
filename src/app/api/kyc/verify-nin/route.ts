import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { verifyNin } from "@/lib/youverify";

const schema = z.object({ nin: z.string().length(11) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "NIN must be 11 digits" }, { status: 400 });
  }

  try {
    const result = await verifyNin(parsed.data.nin);
    const { users } = await getCollections();

    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          "nin.status": result.success ? "verified" : "failed",
          "nin.provider": "youverify",
          ...(result.success ? { "nin.verifiedAt": new Date() } : {}),
          verifiedBadge: result.success,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ success: result.success, message: result.message });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
