import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifyInspectionProposal, notifyInspectionConfirmed } from "@/lib/notifications";

const schema = z.union([
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("counter"), proposedTime: z.string().min(1) }),
]);

// Either party in an inspection booking can accept the other's proposed time, or counter
// with a new one — see src/components/inspection-negotiation.tsx for the UI this drives.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { inspectionBookings } = await getCollections();
  const booking = await inspectionBookings.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const viewerRole =
    booking.tenantId.toString() === session.user.id
      ? "tenant"
      : booking.landlordId.toString() === session.user.id
        ? "landlord"
        : null;
  if (!viewerRole) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }
  if (booking.status !== "pending_response") {
    return NextResponse.json({ error: "This booking already has a confirmed time" }, { status: 409 });
  }
  if (booking.proposedBy === viewerRole) {
    return NextResponse.json({ error: "Waiting on the other party to respond" }, { status: 409 });
  }

  if (parsed.data.action === "accept") {
    await inspectionBookings.updateOne(
      { _id: booking._id },
      { $set: { status: "confirmed", scheduledFor: booking.proposedTime } },
    );
    await notifyInspectionConfirmed({ ...booking, scheduledFor: booking.proposedTime, status: "confirmed" });
    return NextResponse.json({ success: true });
  }

  const proposedTime = new Date(parsed.data.proposedTime);
  await inspectionBookings.updateOne(
    { _id: booking._id },
    { $set: { proposedTime, proposedBy: viewerRole } },
  );
  const otherPartyId = viewerRole === "tenant" ? booking.landlordId : booking.tenantId;
  await notifyInspectionProposal({ ...booking, proposedTime, proposedBy: viewerRole }, otherPartyId);

  return NextResponse.json({ success: true });
}
