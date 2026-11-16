import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { savePayoutAccount } from "@/lib/payout-account";

const schema = z.object({
  bankCode: z.string().trim().min(1),
  accountNumber: z.string().trim().regex(/^\d{10}$/),
});

// Save (or change) the bank account an owner's share of payments settles to — see
// lib/payout-account.ts for the checks and the Paystack subaccount behind it.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose your bank and enter your 10-digit account number." }, { status: 400 });
  }
  const result = await savePayoutAccount(new ObjectId(session.user.id), parsed.data.bankCode, parsed.data.accountNumber);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ success: true, accountName: result.accountName, bankName: result.bankName });
}
