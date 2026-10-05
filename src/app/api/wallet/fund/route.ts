import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { initializeTransaction } from "@/lib/paystack";

const MIN_FUNDING_NGN = 500;

const schema = z.object({ amountNGN: z.coerce.number().int().min(MIN_FUNDING_NGN).max(10_000_000) });

// Topping up the wallet is a normal Paystack checkout into Reallow's account; the balance
// is only credited once the webhook confirms the charge (see kind "wallet_funding").
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Enter an amount of at least ₦${MIN_FUNDING_NGN.toLocaleString()}` },
      { status: 400 },
    );
  }

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: parsed.data.amountNGN * 100,
      reference: `wallet_fund_${session.user.id}_${Date.now()}`,
      metadata: { kind: "wallet_funding", userId: session.user.id },
    });
    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
