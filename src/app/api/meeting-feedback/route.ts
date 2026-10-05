import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { ALL_FEEDBACK_TAGS } from "@/lib/feedback";

const schema = z.object({
  targetType: z.enum(["meeting", "inspection_booking", "verification"]),
  targetId: z.string(),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.enum(ALL_FEEDBACK_TAGS)).max(ALL_FEEDBACK_TAGS.length).default([]),
  comment: z.string().trim().max(1000).optional(),
});

// Rating a calendar entry that has already happened. The participant check differs per
// entry type; the "already happened" check uses whatever time that entry was set for.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || !ObjectId.isValid(parsed.data.targetId)) {
    return NextResponse.json({ error: "Choose a star rating" }, { status: 400 });
  }

  const { meetings, inspectionBookings, properties, meetingFeedback } = await getCollections();
  const userId = session.user.id;
  // Field staff (and admins covering for them) rate the visits they attend: inspections
  // and verification visits. Customers rate the ones they took part in.
  const isFieldStaff = session.user.role === "staff" || session.user.role === "admin";
  const targetId = new ObjectId(parsed.data.targetId);
  let when: Date | undefined;
  let listingId: ObjectId | undefined;

  if (parsed.data.targetType === "meeting") {
    const meeting = await meetings.findOne({ _id: targetId });
    const isParty =
      meeting &&
      ([meeting.landlordId, meeting.tenantId].some((id) => id.toString() === userId) ||
        (isFieldStaff && meeting.kind === "inspection"));
    if (!meeting || !isParty || (meeting.status !== "confirmed" && meeting.status !== "completed")) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    when = meeting.scheduledFor;
    listingId = meeting.listingId;
  } else if (parsed.data.targetType === "inspection_booking") {
    const booking = await inspectionBookings.findOne({ _id: targetId });
    const isParty =
      booking && ([booking.landlordId, booking.tenantId].some((id) => id.toString() === userId) || isFieldStaff);
    if (!booking || !isParty) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }
    when = booking.scheduledFor;
    listingId = booking.listingId;
  } else {
    const listing = await properties.findOne({ _id: targetId });
    if (!listing || (listing.landlordId.toString() !== userId && !isFieldStaff)) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    when = listing.verification.scheduledFor;
    listingId = listing._id;
  }

  if (!when || new Date(when).getTime() > Date.now()) {
    return NextResponse.json({ error: "You can leave feedback once it has happened" }, { status: 409 });
  }

  const result = await meetingFeedback.updateOne(
    { userId: new ObjectId(userId), targetType: parsed.data.targetType, targetId },
    {
      $setOnInsert: {
        userId: new ObjectId(userId),
        targetType: parsed.data.targetType,
        targetId,
        listingId,
        rating: parsed.data.rating,
        tags: parsed.data.tags,
        comment: parsed.data.comment || undefined,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  if (result.upsertedCount === 0) {
    return NextResponse.json({ error: "You've already left feedback for this" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
