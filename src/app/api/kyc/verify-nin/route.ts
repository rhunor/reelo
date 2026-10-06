import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { verifyGovernmentId } from "@/lib/kyc";
import { getT } from "@/lib/i18n/server";

const schema = z.object({ nin: z.string().trim().regex(/^\d{11}$/) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Your NIN is 11 digits." }, { status: 400 });
  }

  const result = await verifyGovernmentId(new ObjectId(session.user.id), "nin", parsed.data.nin, await getT());
  return NextResponse.json(result, { status: result.status });
}
