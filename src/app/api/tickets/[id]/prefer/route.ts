import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

// A landlord marking which interested tenant they'd prefer for their listing — this is
// the one landlord-initiated action in the whole candidates flow, and it still doesn't
// hand the landlord any tenant contact info. It just flags the ticket for Reallow staff,
// who take it from there (e.g. drafting the tenancy agreement).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "landlord") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket" }, { status: 400 });
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
  await tickets.updateOne(
    { _id: ticket._id },
    { $set: { landlordPreferred: true, landlordPreferredAt: now, updatedAt: now } },
  );

  return NextResponse.json({ success: true });
}
