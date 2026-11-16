import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { creditWallet, walletReference } from "@/lib/wallet";
import { createRefund } from "@/lib/paystack";
import { notifyAdmins, notifyPaymentSuperseded, notifyPropertyPaid } from "@/lib/notifications";
import { computeAgreementTotal } from "@/lib/fees";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import { computeReferralCommission, referralRateFor } from "@/lib/referrals";
import type { Agreement, Transaction, TransactionType } from "@/types/models";

// Everything that happens once an agreement's payment has gone through (the Paystack
// webhook calls this). `settlement` says where the owner's share went:
//  - "split": Paystack split it at the point of payment — the owner's share settled straight
//    to their subaccount, so the payment is complete as soon as it lands;
//  - "reallow": the listing is held by Reallow's own placeholder owner, so it's Reallow's;
//  - "legacy": a checkout started before split payments, which landed in Reallow's account
//    and still has to be transferred to the owner by hand ("Mark paid out" in admin).
export async function recordAgreementPayment(
  agreement: Agreement,
  {
    reference,
    amountNGN,
    provider,
    settlement,
    subaccountCode,
  }: {
    reference: string;
    amountNGN: number;
    provider: Transaction["provider"];
    settlement: "split" | "reallow" | "legacy";
    subaccountCode?: string;
  },
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
      // Someone else's payment completed first. The checkout lock (see pay-checkout) is
      // what stops this happening, so it's rare: the payment is refunded to the payer's card
      // through Paystack, and the request closes. Old wallet payments go back to the wallet.
      const byCard = provider === "paystack";
      let cardRefund: Agreement["payment"]["cardRefund"];
      if (byCard) {
        try {
          await createRefund(reference);
          cardRefund = { status: "requested", at: now };
        } catch (error) {
          cardRefund = { status: "failed", at: now, error: (error as Error).message };
          await notifyAdmins(
            "Refund needs attention",
            `A ₦${amountNGN.toLocaleString()} payment (ref ${reference}) arrived after the property was already paid for, and the automatic Paystack refund failed: ${(error as Error).message}. Refund it from the Paystack dashboard.`,
            "/dashboard/admin/agreements",
          );
        }
      } else {
        await creditWallet(agreement.tenantId, amountNGN);
      }
      await transactions.insertOne({
        type: "payment_refund",
        amountNGN,
        payerId: agreement.tenantId,
        payeeId: agreement.tenantId,
        listingId: agreement.listingId,
        agreementId: agreement._id!,
        provider: byCard ? "paystack" : "wallet",
        providerReference: byCard ? `refund_${reference}` : walletReference("agreement_refund", agreement._id!),
        status: cardRefund?.status === "failed" ? "failed" : "success",
        createdAt: now,
      });
      await agreements.updateOne(
        { _id: agreement._id },
        {
          $set: {
            status: requestClosed ? agreement.status : "superseded",
            "payment.status": byCard ? "refunded" : "refunded_to_wallet",
            "payment.amountNGN": amountNGN,
            "payment.reference": reference,
            "payment.paidAt": now,
            ...(cardRefund ? { "payment.cardRefund": cardRefund } : {}),
            updatedAt: now,
          },
        },
      );
      await releasePaymentLock(agreement);
      await notifyPaymentSuperseded(agreement, amountNGN, byCard ? "card" : "wallet");
      return;
    }
    // Otherwise the listing was already off the market for another reason (e.g. Reallow
    // marked it by hand) — record the payment as normal.
  }

  // Rent/caution fee/estate charge are the owner's (settled to their subaccount by the
  // split); the service charge is Reallow's own revenue.
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
        // A split payment (or Reallow's own listing) is already with the owner.
        "payment.status": settlement === "legacy" ? "paid_to_reallow" : "paid_out_to_landlord",
        "payment.amountNGN": amountNGN,
        "payment.reference": reference,
        "payment.paidAt": now,
        ...(settlement === "legacy" ? {} : { "payment.payoutAt": now }),
        ...(settlement === "split" ? { "payment.settledVia": "paystack_split", "payment.subaccountCode": subaccountCode } : {}),
        updatedAt: now,
      },
    },
  );
  await releasePaymentLock(agreement);

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

async function releasePaymentLock(agreement: Agreement): Promise<void> {
  const { properties } = await getCollections();
  await properties.updateOne(
    { _id: agreement.listingId, "paymentLock.agreementId": agreement._id },
    { $unset: { paymentLock: "" } },
  );
}
