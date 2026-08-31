import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyWebhookSignature } from "@/lib/paystack";
import { getCollections } from "@/lib/db";
import type { TransactionType } from "@/types/models";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { properties, agreements, transactions } = await getCollections();
  const now = new Date();

  if (event.event === "charge.success") {
    const { metadata, reference, amount } = event.data;

    if (metadata?.kind === "listing_verification" && metadata?.listingId && metadata?.landlordId) {
      await transactions.insertOne({
        type: "listing_verification" as TransactionType,
        amountNGN: amount / 100,
        payerId: new ObjectId(metadata.landlordId),
        listingId: new ObjectId(metadata.listingId),
        provider: "paystack",
        providerReference: reference,
        status: "success",
        createdAt: now,
      });

      await properties.updateOne(
        { _id: new ObjectId(metadata.listingId) },
        {
          $set: {
            status: "pending_verification",
            "verification.paymentReference": reference,
            "verification.paidAt": now,
            updatedAt: now,
          },
        },
      );
    } else if (metadata?.kind === "agreement_payment" && metadata?.agreementId) {
      const agreement = await agreements.findOne({ _id: new ObjectId(metadata.agreementId) });

      // Guard against double-processing (Paystack can redeliver a webhook) — once an
      // agreement's payment has landed with Reallow, a repeat delivery is a no-op.
      if (agreement && agreement.payment.status === "unpaid") {
        await transactions.insertMany([
          {
            type: "rent" as TransactionType,
            amountNGN: agreement.terms.rentNGN,
            payerId: agreement.tenantId,
            payeeId: agreement.landlordId,
            listingId: agreement.listingId,
            agreementId: agreement._id!,
            provider: "paystack",
            providerReference: reference,
            status: "success",
            createdAt: now,
          },
          {
            type: "deposit" as TransactionType,
            amountNGN: agreement.terms.depositNGN,
            payerId: agreement.tenantId,
            payeeId: agreement.landlordId,
            listingId: agreement.listingId,
            agreementId: agreement._id!,
            provider: "paystack",
            providerReference: reference,
            status: "success",
            createdAt: now,
          },
        ]);

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
      }
    }
  }

  return NextResponse.json({ received: true });
}
