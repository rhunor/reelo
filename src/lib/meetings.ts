import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { notifyMeetingPaid } from "@/lib/notifications";
import type { Meeting, Transaction } from "@/types/models";

export function meetingSide(meeting: Pick<Meeting, "landlordId" | "tenantId">, userId: string) {
  if (meeting.tenantId.toString() === userId) return "tenant" as const;
  if (meeting.landlordId.toString() === userId) return "landlord" as const;
  return null;
}

// The inspection fee for a confirmed inspection meeting has been paid (card or wallet) —
// record the transaction and unlock the visit for Reallow's field agents.
export async function recordMeetingPayment(
  meeting: Meeting,
  { reference, amountNGN, provider }: { reference: string; amountNGN: number; provider: Transaction["provider"] },
): Promise<void> {
  const { meetings, transactions } = await getCollections();
  const now = new Date();

  const { insertedId } = await transactions.insertOne({
    type: "inspection_fee",
    amountNGN,
    payerId: meeting.tenantId,
    payeeId: meeting.landlordId,
    listingId: meeting.listingId,
    meetingId: meeting._id,
    provider,
    providerReference: reference,
    status: "success",
    createdAt: now,
  });

  await meetings.updateOne(
    { _id: meeting._id },
    {
      $set: {
        paidAt: now,
        paymentMethod: provider === "wallet" ? "wallet" : "card",
        transactionId: insertedId as ObjectId,
        updatedAt: now,
      },
    },
  );

  await notifyMeetingPaid(meeting);
}
