import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";
import { computeAgreementTotal } from "@/lib/fees";
import { isStaffRole } from "@/lib/roles";
import { recordAgreementPayment } from "@/lib/agreement-payment";
import { creditWallet, debitWallet, walletReference } from "@/lib/wallet";

// The tenant pays the full total — rent, caution fee, estate charge, and Reallow's service
// charge — together in one Paystack transaction, straight into Reallow's
// account (see the guardrail comment in lib/paystack.ts) — never the landlord's. Reallow
// holds the funds and pays the landlord out separately, out-of-band.
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
  const body = await request.json().catch(() => ({}));

  // Paying from the Reallow wallet settles instantly — same bookkeeping as a card payment.
  if (body?.method === "wallet") {
    const tenantId = agreement.tenantId;
    if (!(await debitWallet(tenantId, breakdown.totalNGN))) {
      return NextResponse.json({ error: "Your wallet balance doesn't cover this" }, { status: 400 });
    }
    const claimed = await agreements.updateOne(
      { _id: agreement._id, "payment.status": "unpaid" },
      { $set: { "payment.status": "paid_to_reallow" } },
    );
    if (claimed.modifiedCount !== 1) {
      await creditWallet(tenantId, breakdown.totalNGN);
      return NextResponse.json({ error: "This agreement has already been paid" }, { status: 409 });
    }
    await recordAgreementPayment(agreement, {
      reference: walletReference("agreement", agreement._id!),
      amountNGN: breakdown.totalNGN,
      provider: "wallet",
    });
    return NextResponse.json({ success: true, paidFromWallet: true });
  }

  const reference = `agreementpay_${agreement._id}_${Date.now()}`;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: breakdown.totalNGN * 100,
      reference,
      metadata: {
        kind: "agreement_payment",
        agreementId: agreement._id!.toString(),
        tenantId: agreement.tenantId.toString(),
        landlordId: agreement.landlordId.toString(),
      },
    });

    return NextResponse.json({ authorizationUrl, reference, breakdown });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
