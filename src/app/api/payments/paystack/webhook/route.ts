import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyWebhookSignature } from "@/lib/paystack";
import { getCollections } from "@/lib/db";
import { computeAgreementTotal } from "@/lib/fees";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import { computeReferralCommission, referralRateFor } from "@/lib/referrals";
import type { Transaction, TransactionType } from "@/types/models";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { agreements, transactions, inspectionBookings, tickets, properties, users, referralCommissions } =
    await getCollections();
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

          // The tenant's checkout-time pick becomes the first proposal, not a final time —
          // either party can accept or counter it from here (see
          // src/app/api/inspection-bookings/[id]/respond/route.ts).
          await inspectionBookings.insertOne({
            listingId: listing._id!,
            landlordId: listing.landlordId,
            tenantId: new ObjectId(metadata.tenantId),
            ticketId: ticket._id!,
            proposedTime: new Date(metadata.scheduledFor),
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
        const breakdown = computeAgreementTotal(agreement.terms);
        const reallowId = await getOrCreateReallowLandlordId();

        // Rent/deposit/estate charge are earmarked for the landlord (held by Reallow
        // until payout); the agency and legal fees are Reallow's own revenue.
        const lineItems: Array<{ type: TransactionType; amountNGN: number; payeeId: ObjectId }> = [
          { type: "rent", amountNGN: breakdown.rentNGN, payeeId: agreement.landlordId },
          ...(breakdown.cautionFeeNGN > 0
            ? [{ type: "deposit" as TransactionType, amountNGN: breakdown.cautionFeeNGN, payeeId: agreement.landlordId }]
            : []),
          ...(breakdown.estateChargeNGN > 0
            ? [{ type: "estate_charge" as TransactionType, amountNGN: breakdown.estateChargeNGN, payeeId: agreement.landlordId }]
            : []),
          { type: "platform_commission", amountNGN: breakdown.agencyFeeNGN, payeeId: reallowId },
          { type: "legal_fee", amountNGN: breakdown.legalFeeNGN, payeeId: reallowId },
        ];

        await transactions.insertMany(
          lineItems.map(
            (item): Transaction => ({
              type: item.type,
              amountNGN: item.amountNGN,
              payerId: agreement.tenantId,
              payeeId: item.payeeId,
              listingId: agreement.listingId,
              agreementId: agreement._id!,
              provider: "paystack",
              providerReference: reference,
              status: "success",
              createdAt: now,
            }),
          ),
        );

        await agreements.updateOne(
          { _id: agreement._id },
          {
            $set: {
              "payment.status": "paid_to_reallow",
              "payment.amountNGN": amount / 100,
              "payment.reference": reference,
              "payment.paidAt": now,
              updatedAt: now,
            },
          },
        );

        // Referral commission — created pending, never auto-credited. Either party on
        // this agreement could have been the one referred (either could have signed up
        // via someone's link, regardless of which side of the deal they ended up on).
        for (const partyId of [agreement.landlordId, agreement.tenantId]) {
          const party = await users.findOne({ _id: partyId });
          if (!party?.referredBy) continue;

          const referrer = await users.findOne({ _id: party.referredBy });
          if (!referrer) continue;

          await referralCommissions.insertOne({
            referrerId: referrer._id!,
            referredUserId: party._id!,
            agreementId: agreement._id!,
            amountNGN: computeReferralCommission(agreement.terms.rentNGN, referrer.role),
            rateApplied: referralRateFor(referrer.role),
            status: "pending",
            createdAt: now,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
