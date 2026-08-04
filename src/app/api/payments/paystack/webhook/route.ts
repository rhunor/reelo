import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyWebhookSignature } from "@/lib/paystack";
import { getCollections } from "@/lib/db";
import type { SubscriptionTier, TransactionType } from "@/types/models";

// Recurring billing note: this maps Plan codes -> tier via env vars, and handles the
// documented Paystack subscription lifecycle events. The exact payload shape for
// subscription.create / invoice.payment_failed / subscription.disable, and whether a
// renewal charge.success carries `data.plan`, should be double-checked against real
// webhook deliveries in the Paystack dashboard before relying on this in production —
// implemented from documented behavior, not verified against a live account.
function tierForPlanCode(planCode: string | undefined): SubscriptionTier | null {
  if (!planCode) return null;
  if (planCode === process.env.PAYSTACK_PRO_PLAN_CODE) return "pro";
  if (planCode === process.env.PAYSTACK_PRO_PLUS_PLAN_CODE) return "pro_plus";
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { users, properties, transactions } = await getCollections();
  const now = new Date();

  if (event.event === "charge.success") {
    const { metadata, reference, amount, customer, plan } = event.data;

    if (metadata?.kind === "subscription" && metadata?.userId && metadata?.tier) {
      await transactions.insertOne({
        type: "subscription" as TransactionType,
        amountNGN: amount / 100,
        payerId: new ObjectId(metadata.userId),
        provider: "paystack",
        providerReference: reference,
        status: "success",
        createdAt: now,
      });

      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await users.updateOne(
        { _id: new ObjectId(metadata.userId) },
        {
          $set: {
            "subscription.tier": metadata.tier,
            "subscription.status": "active",
            "subscription.currentPeriodStart": now,
            "subscription.currentPeriodEnd": periodEnd,
            "subscription.inspectionBookingsUsed": 0,
            updatedAt: now,
          },
        },
      );
    } else if (metadata?.kind === "listing_verification" && metadata?.listingId && metadata?.landlordId) {
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
    } else if (plan?.plan_code && customer?.email) {
      // No metadata on this charge — it's a Paystack-initiated recurring renewal, not a
      // checkout we started. Match the user by email instead.
      const tier = tierForPlanCode(plan.plan_code);
      const user = tier ? await users.findOne({ email: customer.email.toLowerCase() }) : null;

      if (tier && user) {
        await transactions.insertOne({
          type: "subscription" as TransactionType,
          amountNGN: amount / 100,
          payerId: user._id!,
          provider: "paystack",
          providerReference: reference,
          status: "success",
          createdAt: now,
        });

        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await users.updateOne(
          { _id: user._id },
          {
            $set: {
              "subscription.tier": tier,
              "subscription.status": "active",
              "subscription.currentPeriodStart": now,
              "subscription.currentPeriodEnd": periodEnd,
              "subscription.inspectionBookingsUsed": 0,
              updatedAt: now,
            },
          },
        );
      }
    }
  }

  if (event.event === "subscription.create") {
    const { customer, subscription_code, plan } = event.data;
    const tier = tierForPlanCode(plan?.plan_code);
    if (tier && customer?.email) {
      await users.updateOne(
        { email: customer.email.toLowerCase() },
        { $set: { "subscription.providerSubscriptionId": subscription_code, updatedAt: now } },
      );
    }
  }

  if (event.event === "invoice.payment_failed") {
    const subscriptionCode = event.data.subscription?.subscription_code ?? event.data.subscription_code;
    if (subscriptionCode) {
      await users.updateOne(
        { "subscription.providerSubscriptionId": subscriptionCode },
        { $set: { "subscription.status": "past_due", updatedAt: now } },
      );
    }
  }

  if (event.event === "subscription.disable") {
    const subscriptionCode = event.data.subscription_code;
    if (subscriptionCode) {
      await users.updateOne(
        { "subscription.providerSubscriptionId": subscriptionCode },
        { $set: { "subscription.status": "cancelled", "subscription.tier": "free", updatedAt: now } },
      );
    }
  }

  return NextResponse.json({ received: true });
}
