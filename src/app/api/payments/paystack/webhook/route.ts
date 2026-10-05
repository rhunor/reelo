import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyWebhookSignature } from "@/lib/paystack";
import { getCollections } from "@/lib/db";
import { recordAgreementPayment } from "@/lib/agreement-payment";
import { recordMeetingPayment } from "@/lib/meetings";
import { notifyWalletFunded } from "@/lib/notifications";
import { parseLagosDateTimeLocal } from "@/lib/time";
import { creditWallet } from "@/lib/wallet";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { agreements, transactions, inspectionBookings, tickets, properties, meetings } = await getCollections();
  const now = new Date();

  if (event.event === "charge.success") {
    const { metadata, reference, amount } = event.data;

    if (metadata?.kind === "inspection_fee" && metadata?.ticketId) {
      // Guard against double-processing (Paystack can redeliver a webhook) — the
      // reference is unique per checkout attempt, so a repeat delivery is a no-op.
      const alreadyProcessed = await transactions.findOne({ providerReference: reference });
      if (!alreadyProcessed) {
        const ticket = await tickets.findOne({ _id: new ObjectId(metadata.ticketId) });
        const listing = metadata.listingId
          ? await properties.findOne({ _id: new ObjectId(metadata.listingId) })
          : null;

        if (ticket && listing) {
          const { insertedId: transactionId } = await transactions.insertOne({
            type: "inspection_fee",
            amountNGN: amount / 100,
            payerId: new ObjectId(metadata.tenantId),
            payeeId: new ObjectId(metadata.landlordId),
            listingId: listing._id!,
            provider: "paystack",
            providerReference: reference,
            status: "success",
            createdAt: now,
          });

          // Legacy pay-first inspection flow — kept so any checkout started before the
          // Meetings flow existed still completes. The tenant's checkout-time pick becomes the first proposal, not a final time —
          // either party can accept or counter it from here (see
          // src/app/api/inspection-bookings/[id]/respond/route.ts).
          await inspectionBookings.insertOne({
            listingId: listing._id!,
            landlordId: listing.landlordId,
            tenantId: new ObjectId(metadata.tenantId),
            ticketId: ticket._id!,
            proposedTime: parseLagosDateTimeLocal(metadata.scheduledFor),
            proposedBy: "tenant",
            status: "pending_response",
            feeNGN: amount / 100,
            transactionId,
            createdAt: now,
          });
        }
      }
    } else if (metadata?.kind === "agreement_payment" && metadata?.agreementId) {
      const agreement = await agreements.findOne({ _id: new ObjectId(metadata.agreementId) });

      // Guard against double-processing (Paystack can redeliver a webhook) — once an
      // agreement's payment has landed with Reallow, a repeat delivery is a no-op.
      if (agreement && agreement.payment.status === "unpaid") {
        await recordAgreementPayment(agreement, { reference, amountNGN: amount / 100, provider: "paystack" });
      }
    } else if (metadata?.kind === "meeting_inspection_fee" && metadata?.meetingId) {
      // Claimed with a conditional update so a redelivery (or a wallet payment racing this
      // one) can't record the fee twice.
      const claimed = await meetings.findOneAndUpdate(
        { _id: new ObjectId(metadata.meetingId), paidAt: { $exists: false } },
        { $set: { paidAt: now } },
      );
      if (claimed) {
        await recordMeetingPayment(claimed, { reference, amountNGN: amount / 100, provider: "paystack" });
      }
    } else if (metadata?.kind === "wallet_funding" && metadata?.userId) {
      const alreadyProcessed = await transactions.findOne({ providerReference: reference });
      if (!alreadyProcessed) {
        const userId = new ObjectId(metadata.userId);
        const amountNGN = amount / 100;
        await transactions.insertOne({
          type: "wallet_funding",
          amountNGN,
          payerId: userId,
          payeeId: userId,
          provider: "paystack",
          providerReference: reference,
          status: "success",
          createdAt: now,
        });
        await creditWallet(userId, amountNGN);
        await notifyWalletFunded(userId, amountNGN);
      }
    }
  }

  return NextResponse.json({ received: true });
}
