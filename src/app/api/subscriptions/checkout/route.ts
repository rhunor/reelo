import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { initializeTransaction } from "@/lib/paystack";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import type { SubscriptionTier } from "@/types/models";

const schema = z.object({ tier: z.enum(["pro", "pro_plus"]) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tier = parsed.data.tier as SubscriptionTier;
  const amountNGN = SUBSCRIPTION_TIERS[tier].priceNGN;
  const reference = `sub_${session.user.id}_${Date.now()}`;

  // If a Plan code is configured (created once in the Paystack dashboard), Paystack
  // creates a native recurring subscription and auto-charges monthly. Without one, this
  // falls back to a one-off transaction the user has to repeat manually — see README.
  const planCode = tier === "pro" ? process.env.PAYSTACK_PRO_PLAN_CODE : process.env.PAYSTACK_PRO_PLUS_PLAN_CODE;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: amountNGN * 100,
      reference,
      metadata: { userId: session.user.id, tier, kind: "subscription" },
      plan: planCode,
    });

    return NextResponse.json({ authorizationUrl, reference });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
