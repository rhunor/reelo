import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { computeAgreementTotal } from "@/lib/fees";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import { computeReferralCommission, referralRateFor } from "@/lib/referrals";
import type { Agreement, Transaction, TransactionType } from "@/types/models";

// Everything that happens once an agreement's full payment has landed with Reallow —
// shared by the Paystack webhook (card) and the pay-from-wallet path, so both record the
// exact same line items, escrow state, and referral commissions.
export async function recordAgreementPayment(
  agreement: Agreement,
  { reference, amountNGN, provider }: { reference: string; amountNGN: number; provider: Transaction["provider"] },
): Promise<void> {
  const { agreements, transactions, users, referralCommissions } = await getCollections();
  const now = new Date();
  const breakdown = computeAgreementTotal(agreement.terms);
  const reallowId = await getOrCreateReallowLandlordId();

  // Rent/caution fee/estate charge are earmarked for the landlord (held by Reallow until
  // payout); the service charge is Reallow's own revenue.
  const lineItems: Array<{ type: TransactionType; amountNGN: number; payeeId: ObjectId }> = [
    { type: "rent", amountNGN: breakdown.priceNGN, payeeId: agreement.landlordId },
    ...(breakdown.cautionFeeNGN > 0
      ? [{ type: "deposit" as TransactionType, amountNGN: breakdown.cautionFeeNGN, payeeId: agreement.landlordId }]
      : []),
    ...(breakdown.estateChargeNGN > 0
      ? [{ type: "estate_charge" as TransactionType, amountNGN: breakdown.estateChargeNGN, payeeId: agreement.landlordId }]
      : []),
    { type: "platform_commission", amountNGN: breakdown.serviceChargeNGN, payeeId: reallowId },
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
        provider,
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
        "payment.amountNGN": amountNGN,
        "payment.reference": reference,
        "payment.paidAt": now,
        updatedAt: now,
      },
    },
  );

  // Referral commission — created pending, never auto-credited. Either party on this
  // agreement could have been the one referred.
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
