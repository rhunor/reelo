import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const WITHDRAWAL_MINIMUM_NGN = 3000;

const schema = z.object({ amountNGN: z.coerce.number().positive() });

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

  const { users, withdrawalRequests } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  const balance = user?.walletBalanceNGN ?? 0;
  if (parsed.data.amountNGN > balance) {
    return NextResponse.json({ error: "That's more than your current balance" }, { status: 400 });
  }
  if (!user?.bankDetails?.accountNumber) {
    return NextResponse.json(
      { error: "Add your bank details in account settings before requesting a withdrawal" },
      { status: 400 },
    );
  }

  await withdrawalRequests.insertOne({
    userId: new ObjectId(session.user.id),
    amountNGN: parsed.data.amountNGN,
    status: "pending",
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
