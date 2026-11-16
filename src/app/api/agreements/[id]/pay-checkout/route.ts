import { NextResponse, after } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";
import { computeAgreementTotal } from "@/lib/fees";
import { isStaffRole } from "@/lib/roles";
import { settlementFor } from "@/lib/payout-account";
import { notifyPayoutAccountNeeded } from "@/lib/notifications";
import { appBaseUrl } from "@/lib/email";

// The tenant pays the full total — rent, caution fee, estate charge, and Reallow's service
// charge — in one Paystack transaction that Paystack splits at the point of payment: the
// owner's share settles straight to their subaccount and only the service charge settles
// to Reallow (see lib/paystack.ts). Reallow never holds the owner's money. Card only — a
// wallet balance can't be used for rent or a purchase.
//
// While this person is at checkout the property is locked to them, so a second applicant
// can't pay at the same time (a split payment can't be taken back from the owner).
const CHECKOUT_LOCK_MS = 30 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email || isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement" }, { status: 400 });
  }

  const { agreements } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(id) });

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }
  if (agreement.tenantId.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not a party to this agreement" }, { status: 403 });
  }
  if (agreement.status === "superseded" || agreement.status === "cancelled") {
    return NextResponse.json({ error: "This payment request is no longer open" }, { status: 409 });
  }
  // Once someone else's payment for this property has completed, nobody else can pay.
  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: agreement.listingId }, { projection: { status: 1 } });
  if (agreement.ticketId && listing?.status !== "published") {
    return NextResponse.json({ error: "Someone completed payment for this property before you" }, { status: 409 });
  }
  if (agreement.status !== "fully_signed") {
    return NextResponse.json(
      { error: "Both parties must sign the agreement before paying" },
      { status: 409 },
    );
  }
  if (agreement.payment.status !== "unpaid") {
    return NextResponse.json({ error: "This agreement has already been paid" }, { status: 409 });
  }

  const breakdown = computeAgreementTotal(agreement.terms);

  const { users } = await getCollections();
  const owner = await users.findOne({ _id: agreement.landlordId }, { projection: { payoutAccount: 1 } });
  const settlement = await settlementFor(owner);
  if (settlement.kind === "missing") {
    after(() => notifyPayoutAccountNeeded(agreement));
    return NextResponse.json(
      { error: "The owner hasn't set up their payout account yet. We've asked them to — please try again soon." },
      { status: 409 },
    );
  }

  // Take the checkout lock: free, expired, or already this agreement's.
  const now = new Date();
  const locked = await properties.updateOne(
    {
      _id: agreement.listingId,
      $or: [
        { paymentLock: { $exists: false } },
        { "paymentLock.until": { $lt: now } },
        { "paymentLock.agreementId": agreement._id },
      ],
    },
    { $set: { paymentLock: { agreementId: agreement._id!, until: new Date(now.getTime() + CHECKOUT_LOCK_MS) } } },
  );
  if (locked.matchedCount === 0) {
    return NextResponse.json(
      { error: "Another applicant is completing payment for this property right now. Please check back in 30 minutes." },
      { status: 409 },
    );
  }

  const reference = `agreementpay_${agreement._id}_${Date.now()}`;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: breakdown.totalNGN * 100,
      reference,
      ...(settlement.kind === "subaccount"
        ? { subaccount: settlement.code, transactionChargeKobo: breakdown.serviceChargeNGN * 100 }
        : {}),
      callbackUrl: `${appBaseUrl()}/agreements/${agreement._id}`,
      metadata: {
        kind: "agreement_payment",
        agreementId: agreement._id!.toString(),
        tenantId: agreement.tenantId.toString(),
        landlordId: agreement.landlordId.toString(),
        split: settlement.kind === "subaccount" ? settlement.code : undefined,
      },
    });

    return NextResponse.json({ authorizationUrl, reference, breakdown });
  } catch (error) {
    // Checkout never started — free the property for others straight away.
    await properties.updateOne(
      { _id: agreement.listingId, "paymentLock.agreementId": agreement._id },
      { $unset: { paymentLock: "" } },
    );
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
