import { NextResponse } from "next/server";
import { canActAsLandlord } from "@/lib/reallow-landlord";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { meetingNeedsFee, meetingSide } from "@/lib/meetings";
import { notifyMeetingConfirmed, notifyMeetingDeclined, notifyMeetingPaid, notifyMeetingProposed } from "@/lib/notifications";
import { parseLagosDateTimeLocal } from "@/lib/time";

const schema = z.union([
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
  z.object({ action: z.literal("counter"), proposedTime: z.string().min(1) }),
]);

// Only the side that didn't propose the current time can answer it.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid meeting" }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { meetings } = await getCollections();
  const meeting = await meetings.findOne({ _id: new ObjectId(id) });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  // Admins answer on the landlord side for Reallow-owned listings.
  const side =
    meetingSide(meeting, session.user.id) ??
    ((await canActAsLandlord(meeting.landlordId, session.user)) ? ("landlord" as const) : null);
  if (!side) {
    return NextResponse.json({ error: "Not your meeting" }, { status: 403 });
  }
  if (meeting.status !== "pending") {
    return NextResponse.json({ error: "This request has already been answered" }, { status: 409 });
  }
  if (meeting.proposedBy === side) {
    return NextResponse.json({ error: "Waiting on the other side to respond" }, { status: 409 });
  }

  const now = new Date();
  const otherSideId = side === "tenant" ? meeting.landlordId : meeting.tenantId;
  // The applicant pays the inspection fee before accepting (see ../pay with intent "accept").
  const applicantMustPay = side === "tenant" && meetingNeedsFee(meeting);

  if (parsed.data.action === "accept") {
    if (applicantMustPay) {
      return NextResponse.json(
        { error: "Pay the inspection fee to accept this meeting", needsPayment: true, amountNGN: meeting.feeNGN },
        { status: 402 },
      );
    }
    // Conditional on still being pending, so a double-click can't confirm twice.
    const result = await meetings.updateOne(
      { _id: meeting._id, status: "pending", proposedBy: meeting.proposedBy },
      { $set: { status: "confirmed", scheduledFor: meeting.proposedTime, respondedAt: now, updatedAt: now } },
    );
    if (result.modifiedCount === 1) {
      const confirmed = { ...meeting, status: "confirmed" as const, scheduledFor: meeting.proposedTime };
      await notifyMeetingConfirmed(confirmed);
      // A paid meeting is now on — field staff need to send an agent.
      if (meeting.kind === "meeting" && meeting.paidAt) await notifyMeetingPaid(confirmed, { landlord: false });
    }
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "decline") {
    await meetings.updateOne(
      { _id: meeting._id },
      { $set: { status: "declined", respondedAt: now, updatedAt: now } },
    );
    await notifyMeetingDeclined(meeting, otherSideId);
    // No refund on a decline: the two sides reschedule, and a paid fee carries over to the
    // next meeting booked for this application (see POST /api/meetings).
    return NextResponse.json({ success: true });
  }

  const proposedTime = parseLagosDateTimeLocal(parsed.data.proposedTime);
  if (Number.isNaN(proposedTime.getTime()) || proposedTime.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a time in the future" }, { status: 400 });
  }
  if (applicantMustPay) {
    // The applicant's counter-proposal is held until they pay — then it's sent.
    await meetings.updateOne(
      { _id: meeting._id },
      { $set: { proposedTime, proposedBy: side, status: "awaiting_payment", respondedAt: now, updatedAt: now } },
    );
    return NextResponse.json({ success: true, needsPayment: true, amountNGN: meeting.feeNGN });
  }
  await meetings.updateOne(
    { _id: meeting._id },
    { $set: { proposedTime, proposedBy: side, respondedAt: now, updatedAt: now } },
  );
  await notifyMeetingProposed({ ...meeting, proposedTime, proposedBy: side }, otherSideId, true);

  return NextResponse.json({ success: true });
}
