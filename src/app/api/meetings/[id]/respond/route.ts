import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { meetingSide } from "@/lib/meetings";
import { notifyMeetingConfirmed, notifyMeetingDeclined, notifyMeetingProposed } from "@/lib/notifications";
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
  const side = meetingSide(meeting, session.user.id);
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

  if (parsed.data.action === "accept") {
    // Conditional on still being pending, so a double-click can't confirm twice.
    const result = await meetings.updateOne(
      { _id: meeting._id, status: "pending", proposedBy: meeting.proposedBy },
      { $set: { status: "confirmed", scheduledFor: meeting.proposedTime, respondedAt: now, updatedAt: now } },
    );
    if (result.modifiedCount === 1) {
      await notifyMeetingConfirmed({ ...meeting, status: "confirmed", scheduledFor: meeting.proposedTime });
    }
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "decline") {
    await meetings.updateOne(
      { _id: meeting._id },
      { $set: { status: "declined", respondedAt: now, updatedAt: now } },
    );
    await notifyMeetingDeclined(meeting, otherSideId);
    return NextResponse.json({ success: true });
  }

  const proposedTime = parseLagosDateTimeLocal(parsed.data.proposedTime);
  if (Number.isNaN(proposedTime.getTime()) || proposedTime.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a time in the future" }, { status: 400 });
  }
  await meetings.updateOne(
    { _id: meeting._id },
    { $set: { proposedTime, proposedBy: side, respondedAt: now, updatedAt: now } },
  );
  await notifyMeetingProposed({ ...meeting, proposedTime, proposedBy: side }, otherSideId, true);

  return NextResponse.json({ success: true });
}
