import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";
import { recordMeetingPayment } from "@/lib/meetings";
import { creditWallet, debitWallet, walletReference } from "@/lib/wallet";
import { appBaseUrl } from "@/lib/email";

const schema = z.object({ method: z.enum(["wallet", "card"]), intent: z.enum(["accept"]).optional() });

// The applicant pays the meeting's inspection fee — from their Reallow wallet (instant) or by
// card (confirmed by the Paystack webhook). What happens once it's paid is in
// recordMeetingPayment:
//  - their own proposal (awaiting_payment) is sent to the landlord;
//  - paying with intent "accept" on the landlord's proposal confirms it;
//  - an older inspection whose time was already agreed goes ahead.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid meeting" }, { status: 400 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose how to pay" }, { status: 400 });
  }

  const { meetings } = await getCollections();
  const meeting = await meetings.findOne({ _id: new ObjectId(id) });
  if (!meeting || meeting.tenantId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  if (!meeting.feeNGN) {
    return NextResponse.json({ error: "Nothing to pay for this meeting" }, { status: 400 });
  }
  if (meeting.paidAt) {
    return NextResponse.json({ error: "Already paid" }, { status: 409 });
  }
  const payable =
    meeting.kind === "inspection"
      ? meeting.status === "confirmed"
      : meeting.status === "awaiting_payment" ||
        (meeting.status === "pending" && meeting.proposedBy === "landlord" && parsed.data.intent === "accept");
  if (!payable) {
    return NextResponse.json({ error: "This meeting can't be paid for right now" }, { status: 409 });
  }
  // Remembered on the meeting so a card payment (confirmed later by the webhook) still
  // knows to accept the landlord's time.
  if (meeting.status === "pending" && parsed.data.intent === "accept") {
    await meetings.updateOne({ _id: meeting._id }, { $set: { acceptOnPayment: true } });
    meeting.acceptOnPayment = true;
  }

  if (parsed.data.method === "wallet") {
    const userId = new ObjectId(session.user.id);
    if (!(await debitWallet(userId, meeting.feeNGN))) {
      return NextResponse.json({ error: "Your wallet balance doesn't cover this" }, { status: 400 });
    }
    // Claim the meeting as paid before recording — if another payment already landed in
    // between, put the money back instead of charging twice.
    const claimed = await meetings.updateOne(
      { _id: meeting._id, paidAt: { $exists: false } },
      { $set: { paidAt: new Date() } },
    );
    if (claimed.modifiedCount !== 1) {
      await creditWallet(userId, meeting.feeNGN);
      return NextResponse.json({ error: "Already paid" }, { status: 409 });
    }
    await recordMeetingPayment(meeting, {
      reference: walletReference("inspection", meeting._id!),
      amountNGN: meeting.feeNGN,
      provider: "wallet",
    });
    return NextResponse.json({ success: true });
  }

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: meeting.feeNGN * 100,
      reference: `meeting_${meeting._id}_${Date.now()}`,
      callbackUrl: `${appBaseUrl()}/dashboard?panel=meetings`,
      metadata: { kind: "meeting_inspection_fee", meetingId: meeting._id!.toString() },
    });
    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
