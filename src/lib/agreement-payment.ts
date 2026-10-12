import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { creditWallet, walletReference } from "@/lib/wallet";
import { notifyPaymentSuperseded, notifyPropertyPaid } from "@/lib/notifications";
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
  const { agreements, transactions, users, referralCommissions, properties } = await getCollections();
  const now = new Date();
  const breakdown = computeAgreementTotal(agreement.terms);
  const reallowId = await getOrCreateReallowLandlordId();
  const isSale = agreement.kind === "sale";

  // A payment that lands after the request closed (withdrawn, or someone else paid while
  // this person's checkout was still open) never takes the property.
  const requestClosed = agreement.status === "superseded" || agreement.status === "cancelled";

  // First to pay wins. Taking the property off the market is one atomic update, so when
  // two applicants pay at the same moment only one of them gets it.
  const claimed = requestClosed
    ? { modifiedCount: 0 }
    : await properties.updateOne(
        { _id: agreement.listingId, status: "published" },
        { $set: { status: isSale ? "sold" : "rented", updatedAt: now } },
      );
  if (claimed.modifiedCount === 0) {
    const otherPaid = requestClosed
      ? true
      : await agreements.findOne({
          listingId: agreement.listingId,
          _id: { $ne: agreement._id },
          "payment.status": { $in: ["paid_to_reallow", "paid_out_to_landlord"] },
        });
    if (otherPaid) {
      // Someone else's payment completed first: this money goes straight back to the
      // payer's Reallow wallet, and the request closes.
      await creditWallet(agreement.tenantId, amountNGN);
      await transactions.insertOne({
        type: "payment_refund",
        amountNGN,
        payerId: agreement.tenantId,
        payeeId: agreement.tenantId,
        listingId: agreement.listingId,
        agreementId: agreement._id!,
        provider: "wallet",
        providerReference: walletReference("agreement_refund", agreement._id!),
        status: "success",
        createdAt: now,
      });
      await agreements.updateOne(
        { _id: agreement._id },
        {
          $set: {
            status: requestClosed ? agreement.status : "superseded",
            "payment.status": "refunded_to_wallet",
            "payment.amountNGN": amountNGN,
            "payment.reference": reference,
            "payment.paidAt": now,
            updatedAt: now,
          },
        },
      );
      await notifyPaymentSuperseded(agreement, amountNGN);
      return;
    }
    // Otherwise the listing was already off the market for another reason (e.g. Reallow
    // marked it by hand) — record the payment as normal.
  }

  // Rent/caution fee/estate charge are earmarked for the landlord (held by Reallow until
  // payout); the service charge is Reallow's own revenue.
  const lineItems: Array<{ type: TransactionType; amountNGN: number; payeeId: ObjectId }> = [
    { type: isSale ? "sale_price" : "rent", amountNGN: breakdown.priceNGN, payeeId: agreement.landlordId },
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

  // Every other open payment request for this property closes, and those applicants hear
  // that someone completed payment first.
  const others = await agreements
    .find({
      listingId: agreement.listingId,
      _id: { $ne: agreement._id },
      "payment.status": "unpaid",
      status: { $nin: ["superseded", "cancelled"] },
    })
    .toArray();
  if (others.length) {
    await agreements.updateMany(
      { _id: { $in: others.map((o) => o._id!) }, "payment.status": "unpaid" },
      { $set: { status: "superseded", updatedAt: now } },
    );
    for (const other of others) await notifyPaymentSuperseded(other);
  }
  await notifyPropertyPaid(agreement, amountNGN);

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
