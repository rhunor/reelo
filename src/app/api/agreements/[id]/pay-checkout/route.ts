import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";

// The tenant pays rent + deposit together, in one Paystack transaction, straight into
// Reallow's account (see the guardrail comment in lib/paystack.ts) — never the landlord's.
// Reallow holds the funds and pays the landlord out separately, out-of-band.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email || session.user.role !== "tenant") {
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

  const amountNGN = agreement.terms.rentNGN + agreement.terms.depositNGN;
  const reference = `agreementpay_${agreement._id}_${Date.now()}`;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: amountNGN * 100,
      reference,
      metadata: {
        kind: "agreement_payment",
        agreementId: agreement._id!.toString(),
        tenantId: agreement.tenantId.toString(),
        landlordId: agreement.landlordId.toString(),
      },
    });

    return NextResponse.json({ authorizationUrl, reference });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
