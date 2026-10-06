import { NextResponse } from "next/server";
import { canActAsLandlord } from "@/lib/reallow-landlord";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { getInspectionFee } from "@/lib/fees";
import { notifyMeetingProposed } from "@/lib/notifications";
import { isStaffRole } from "@/lib/roles";
import { parseLagosDateTimeLocal } from "@/lib/time";
import type { Meeting } from "@/types/models";

const schema = z.object({
  ticketId: z.string(),
  kind: z.enum(["inspection", "meeting"]),
  proposedTime: z.string().min(1),
});

// Either side of an accepted application books a meeting or inspection from the
// dashboard's Meetings window. Nothing is confirmed here — the other side accepts,
// declines, or suggests another time (see ./[id]/respond).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (isStaffRole(session.user.role) && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || !ObjectId.isValid(parsed.data.ticketId)) {
    return NextResponse.json({ error: "Pick a day and time" }, { status: 400 });
  }

  const proposedTime = parseLagosDateTimeLocal(parsed.data.proposedTime);
  if (Number.isNaN(proposedTime.getTime()) || proposedTime.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a time in the future" }, { status: 400 });
  }

  const { tickets, properties, meetings, users } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(parsed.data.ticketId) });
  if (!ticket?.listingId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  const listing = await properties.findOne({ _id: ticket.listingId });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.status !== "published") {
    return NextResponse.json({ error: "This property isn't available any more" }, { status: 409 });
  }

  const side =
    ticket.userId.toString() === session.user.id
      ? "tenant"
      : (await canActAsLandlord(listing.landlordId, session.user))
        ? "landlord"
        : null;
  if (!side) {
    return NextResponse.json({ error: "This isn't your application" }, { status: 403 });
  }
  const decision = ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined);
  if (decision !== "approved") {
    return NextResponse.json({ error: "The application hasn't been accepted yet" }, { status: 409 });
  }

  // Same rule as before: only a verified applicant can have a (paid) inspection.
  if (parsed.data.kind === "inspection") {
    const applicant = await users.findOne({ _id: ticket.userId });
    if (!applicant?.verifiedBadge) {
      return NextResponse.json(
        {
          error:
            side === "tenant"
              ? "Verify your identity before booking an inspection"
              : "The applicant needs to verify their identity before an inspection can be booked",
        },
        { status: 403 },
      );
    }
  }

  const open = await meetings.findOne({
    ticketId: ticket._id,
    kind: parsed.data.kind,
    status: "pending",
  });
  if (open) {
    return NextResponse.json(
      { error: `There's already a pending ${parsed.data.kind} request for this application — respond to it in Meetings` },
      { status: 409 },
    );
  }

  const now = new Date();
  const meeting: Omit<Meeting, "_id"> = {
    ticketId: ticket._id!,
    listingId: listing._id!,
    landlordId: listing.landlordId,
    tenantId: ticket.userId,
    kind: parsed.data.kind,
    status: "pending",
    proposedTime,
    proposedBy: side,
    feeNGN: parsed.data.kind === "inspection" ? getInspectionFee(listing.location.city) : undefined,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await meetings.insertOne(meeting);

  await notifyMeetingProposed(
    { ...meeting, _id: insertedId },
    side === "tenant" ? listing.landlordId : ticket.userId,
    false,
  );

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
