import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { canActAsLandlord } from "@/lib/reallow-landlord";
import { meetingSide, refundMeetingFee } from "@/lib/meetings";
import { notifyMeetingCancelled } from "@/lib/notifications";

// Either side cancels an upcoming meeting (or the applicant drops a request they haven't
// paid for yet). Unlike a decline — where the two sides reschedule and the fee carries
// over — a cancellation ends it, so a paid fee is refunded to the applicant's wallet.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid meeting" }, { status: 400 });
  }

  const { meetings } = await getCollections();
  const meeting = await meetings.findOne({ _id: new ObjectId(id) });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  const side =
    meetingSide(meeting, session.user.id) ??
    ((await canActAsLandlord(meeting.landlordId, session.user)) ? ("landlord" as const) : null);
  if (!side) {
    return NextResponse.json({ error: "Not your meeting" }, { status: 403 });
  }
  if (meeting.status === "awaiting_payment" && side !== "tenant") {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const now = new Date();
  if (new Date(meeting.scheduledFor ?? meeting.proposedTime).getTime() < now.getTime()) {
    return NextResponse.json({ error: "This meeting has already happened" }, { status: 409 });
  }
  // Conditional, so it can only be cancelled (and refunded) once.
  const result = await meetings.updateOne(
    { _id: meeting._id, status: { $in: ["awaiting_payment", "pending", "confirmed"] } },
    { $set: { status: "cancelled", cancelledBy: side, updatedAt: now } },
  );
  if (result.modifiedCount !== 1) {
    return NextResponse.json({ error: "This meeting can't be cancelled any more" }, { status: 409 });
  }

  await refundMeetingFee({ ...meeting, status: "cancelled" });
  // An unsent request was never seen by the landlord — nobody to tell.
  if (meeting.status !== "awaiting_payment") {
    await notifyMeetingCancelled(meeting, side === "tenant" ? meeting.landlordId : meeting.tenantId);
  }
  return NextResponse.json({ success: true, refunded: Boolean(meeting.paidAt && meeting.feeNGN) });
}
