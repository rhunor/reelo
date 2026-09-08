import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifyLandlordDecision } from "@/lib/notifications";

const schema = z.object({ decision: z.enum(["approved", "declined"]) });

// A landlord approving or declining a tenant's interest in their listing — still doesn't
// hand the landlord any tenant contact info, it just records the decision and notifies
// the tenant. Approving is what unlocks the tenant booking a paid physical inspection.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "landlord") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const { tickets, properties } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket || !ticket.listingId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const listing = await properties.findOne({ _id: ticket.listingId });
  if (!listing || listing.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not your listing" }, { status: 403 });
  }

  const now = new Date();
  const decision = parsed.data.decision;
  await tickets.updateOne(
    { _id: ticket._id },
    {
      $set: {
        landlordDecision: decision,
        landlordDecisionAt: now,
        landlordPreferred: decision === "approved",
        landlordPreferredAt: decision === "approved" ? now : ticket.landlordPreferredAt,
        updatedAt: now,
      },
    },
  );

  await notifyLandlordDecision(ticket, decision);

  return NextResponse.json({ success: true });
}
