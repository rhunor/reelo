import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { refundMeetingFee } from "@/lib/meetings";
import { notifyApplicationWithdrawn } from "@/lib/notifications";

// The applicant changes their mind. Their application leaves the landlord's list, upcoming
// meetings for it are cancelled (a paid meeting fee is refunded to their wallet, as with any
// cancellation) and an unpaid payment request is withdrawn. They can apply again later.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid application" }, { status: 400 });

  const { tickets, properties, meetings, agreements } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const ticket = await tickets.findOne({ _id: new ObjectId(id), userId, listingId: { $exists: true } });
  if (!ticket?.listingId) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // A completed payment can't be undone this way.
  const paid = await agreements.findOne({
    listingId: ticket.listingId,
    tenantId: userId,
    "payment.status": { $in: ["paid_to_reallow", "paid_out_to_landlord"] },
  });
  if (paid) {
    return NextResponse.json({ error: "You've already paid for this property — contact Reallow" }, { status: 409 });
  }

  const now = new Date();
  const result = await tickets.updateOne(
    { _id: ticket._id, withdrawnAt: { $exists: false } },
    { $set: { withdrawnAt: now, status: "resolved", updatedAt: now } },
  );
  if (result.modifiedCount !== 1) return NextResponse.json({ error: "Already withdrawn" }, { status: 409 });

  const open = await meetings
    .find({ ticketId: ticket._id, status: { $in: ["awaiting_payment", "pending", "confirmed"] } })
    .toArray();
  for (const meeting of open) {
    const cancelled = await meetings.updateOne(
      { _id: meeting._id, status: { $in: ["awaiting_payment", "pending", "confirmed"] } },
      { $set: { status: "cancelled", cancelledBy: "tenant", updatedAt: now } },
    );
    if (cancelled.modifiedCount === 1) await refundMeetingFee({ ...meeting, status: "cancelled" });
  }
  await agreements.updateMany(
    { listingId: ticket.listingId, tenantId: userId, "payment.status": "unpaid", status: { $nin: ["superseded", "cancelled"] } },
    { $set: { status: "cancelled", updatedAt: now } },
  );

  const listing = await properties.findOne({ _id: ticket.listingId });
  if (listing) await notifyApplicationWithdrawn(ticket, listing);
  return NextResponse.json({ success: true });
}
