import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import {
  notifyMeetingConfirmed,
  notifyMeetingPaid,
  notifyMeetingProposed,
  notifyMeetingRefunded,
  notifyAdmins,
} from "@/lib/notifications";
import { creditWallet, walletReference } from "@/lib/wallet";
import { createRefund } from "@/lib/paystack";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import type { Meeting, Transaction } from "@/types/models";

export function meetingSide(meeting: Pick<Meeting, "landlordId" | "tenantId">, userId: string) {
  if (meeting.tenantId.toString() === userId) return "tenant" as const;
  if (meeting.landlordId.toString() === userId) return "landlord" as const;
  return null;
}

// The applicant must pay before a fee-bearing meeting can be sent (their own proposal) or
// accepted (the landlord's). Meetings booked before the fee existed have no feeNGN.
export function meetingNeedsFee(meeting: Pick<Meeting, "feeNGN" | "paidAt">): boolean {
  return Boolean(meeting.feeNGN) && !meeting.paidAt;
}

// The applicant's fee has been paid (card or wallet). Record the transaction, then move the
// meeting on:
//  - their own proposal (awaiting_payment) is now sent to the landlord;
//  - a landlord's proposal they paid to accept is now confirmed;
//  - an older-style inspection that was already agreed is now on.
export async function recordMeetingPayment(
  meeting: Meeting,
  { reference, amountNGN, provider }: { reference: string; amountNGN: number; provider: Transaction["provider"] },
): Promise<void> {
  const { meetings, transactions } = await getCollections();
  const now = new Date();

  // The inspection fee pays for Reallow's agent attending — it's Reallow's own revenue.
  const { insertedId } = await transactions.insertOne({
    type: "inspection_fee",
    amountNGN,
    payerId: meeting.tenantId,
    payeeId: await getOrCreateReallowLandlordId(),
    listingId: meeting.listingId,
    meetingId: meeting._id,
    provider,
    providerReference: reference,
    status: "success",
    createdAt: now,
  });

  const paid = {
    paidAt: now,
    paymentMethod: provider === "wallet" ? ("wallet" as const) : ("card" as const),
    transactionId: insertedId as ObjectId,
    updatedAt: now,
  };
  await meetings.updateOne({ _id: meeting._id }, { $set: paid });
  const current = { ...meeting, ...paid };

  if (meeting.status === "awaiting_payment") {
    // Conditional, so a duplicate webhook can't send the request twice.
    const sent = await meetings.updateOne(
      { _id: meeting._id, status: "awaiting_payment" },
      { $set: { status: "pending", updatedAt: now } },
    );
    if (sent.modifiedCount === 1) {
      await notifyMeetingProposed({ ...current, status: "pending" }, meeting.landlordId, Boolean(meeting.respondedAt));
    }
    return;
  }

  if (meeting.status === "pending" && meeting.proposedBy === "landlord" && meeting.acceptOnPayment) {
    const confirmed = await meetings.updateOne(
      { _id: meeting._id, status: "pending" },
      { $set: { status: "confirmed", scheduledFor: meeting.proposedTime, respondedAt: now, updatedAt: now } },
    );
    if (confirmed.modifiedCount === 1) {
      const done = { ...current, status: "confirmed" as const, scheduledFor: meeting.proposedTime };
      await notifyMeetingConfirmed(done);
      await notifyMeetingPaid(done, { landlord: false });
    }
    return;
  }

  if (meeting.kind === "inspection") {
    // Older flow: an inspection whose time was already agreed.
    await notifyMeetingPaid(current);
  } else if (meeting.status === "cancelled") {
    // A card payment that landed after the meeting was cancelled — give it straight back.
    // (After a decline it stays paid and carries over to the rescheduled meeting.)
    await refundMeetingFee(current);
  }
}

// A paid meeting was cancelled: the fee goes back to the applicant's card through Paystack.
// A fee paid from an old wallet balance (before top-ups were switched off) goes back to that
// balance instead. Claimed with a conditional update so it can only ever be refunded once.
export async function refundMeetingFee(meeting: Meeting): Promise<void> {
  if (!meeting.paidAt || !meeting.feeNGN) return;
  const { meetings, transactions } = await getCollections();
  const now = new Date();
  const byCard = meeting.paymentMethod === "card";
  const claimed = await meetings.updateOne(
    { _id: meeting._id, paidAt: { $exists: true }, refundedAt: { $exists: false } },
    { $set: { refundedAt: now, refundedVia: byCard ? "card" : "wallet", updatedAt: now } },
  );
  if (claimed.modifiedCount !== 1) return;

  let failed = false;
  if (byCard) {
    const paid = meeting.transactionId ? await transactions.findOne({ _id: meeting.transactionId }) : null;
    try {
      if (!paid?.providerReference) throw new Error("payment reference not found");
      await createRefund(paid.providerReference);
    } catch (error) {
      failed = true;
      await meetings.updateOne({ _id: meeting._id }, { $set: { refundFailed: true } });
      await notifyAdmins(
        "Refund needs attention",
        `The ₦${meeting.feeNGN.toLocaleString()} inspection fee for a cancelled meeting couldn't be refunded automatically (${(error as Error).message}). Refund it from the Paystack dashboard.`,
        "/dashboard/admin",
      );
    }
  } else {
    await creditWallet(meeting.tenantId, meeting.feeNGN);
  }
  await transactions.insertOne({
    type: "inspection_fee_refund",
    amountNGN: meeting.feeNGN,
    payerId: meeting.tenantId,
    payeeId: meeting.tenantId,
    listingId: meeting.listingId,
    meetingId: meeting._id,
    provider: byCard ? "paystack" : "wallet",
    providerReference: byCard ? `refund_meeting_${meeting._id}` : walletReference("inspection_refund", meeting._id!),
    status: failed ? "failed" : "success",
    createdAt: now,
  });
  await notifyMeetingRefunded(meeting, meeting.feeNGN, byCard ? "card" : "wallet");
}
