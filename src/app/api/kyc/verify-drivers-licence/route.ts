import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { verifyGovernmentId } from "@/lib/kyc";

// Nigerian licence numbers are letters and digits (e.g. ABC12345DE67), usually 12 characters.
const schema = z.object({
  licenceNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{8,15}$/)),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Enter your driver's licence number as it appears on the card." },
      { status: 400 },
    );
  }

  const result = await verifyGovernmentId(new ObjectId(session.user.id), "drivers_licence", parsed.data.licenceNumber);
  return NextResponse.json(result, { status: result.status });
}
