import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { after } from "next/server";
import { notifyAdmins } from "@/lib/notifications";
import { withdrawableNGN } from "@/lib/withdrawable";

const WITHDRAWAL_MINIMUM_NGN = 3000;

const schema = z.object({ amountNGN: z.coerce.number().positive() });

// Only approved referral earnings can be withdrawn (see lib/withdrawable.ts) — wallet
// top-ups and refunds stay on Reallow, for inspection fees and other payments.
// Requesting a withdrawal only creates the request — nothing moves until an admin marks
// it paid (see markWithdrawalPaid in dashboard/admin/actions.ts), same manual pattern as
// every other payout in this app. Not staff-restricted: staff are the primary earners of
// the (higher) staff referral rate, so they need to be able to withdraw too — this is
// purely about wallet balance, unrelated to the customer-transaction restrictions
// isStaffRole enforces elsewhere.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (parsed.data.amountNGN < WITHDRAWAL_MINIMUM_NGN) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ₦${WITHDRAWAL_MINIMUM_NGN.toLocaleString()}` },
      { status: 400 },
    );
  }

  const { users, withdrawalRequests, referralCommissions } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const [user, earned, withdrawn] = await Promise.all([
    users.findOne({ _id: userId }),
    referralCommissions.aggregate<{ total: number }>([
      { $match: { referrerId: userId, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amountNGN" } } },
    ]).toArray(),
    withdrawalRequests.aggregate<{ total: number }>([
      { $match: { userId, status: { $in: ["pending", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$amountNGN" } } },
    ]).toArray(),
  ]);
  const available = withdrawableNGN({
    walletBalanceNGN: user?.walletBalanceNGN ?? 0,
    approvedEarningsNGN: earned[0]?.total ?? 0,
    withdrawnOrPendingNGN: withdrawn[0]?.total ?? 0,
  });
  if (parsed.data.amountNGN > available) {
    return NextResponse.json(
      {
        error:
          available > 0
            ? `You can withdraw up to ₦${available.toLocaleString()} — only approved referral earnings can be withdrawn. Money you added or got back as a refund can be used for payments on Reallow.`
            : "Only approved referral earnings can be withdrawn. Money you added or got back as a refund can be used for payments on Reallow.",
      },
      { status: 400 },
    );
  }
  // Paid only to a payout account Paystack confirmed is in their own name.
  if (!user?.payoutAccount) {
    return NextResponse.json(
      { error: "Add your payout bank account in Settings before requesting a withdrawal" },
      { status: 400 },
    );
  }

  await withdrawalRequests.insertOne({
    userId,
    amountNGN: parsed.data.amountNGN,
    status: "pending",
    createdAt: new Date(),
  });
  after(() =>
    notifyAdmins(
      "Withdrawal requested",
      `${user.name} asked to withdraw ₦${parsed.data.amountNGN.toLocaleString()} from their wallet.`,
      "/dashboard/admin/referrals",
    ),
  );

  return NextResponse.json({ success: true });
}
