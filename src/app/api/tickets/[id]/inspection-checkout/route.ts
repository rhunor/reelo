import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";
import { getInspectionFee } from "@/lib/fees";

const schema = z.object({ scheduledFor: z.string().min(1) });

// A tenant paying to book a physical inspection — only once the landlord has approved
// their interest in this specific listing (see the ticket's landlordDecision). The fee
// varies by location and covers Reallow's agent physically travelling there; the actual
// InspectionBooking only gets created once Paystack confirms payment (see the webhook),
// not here, so an abandoned checkout never leaves a stray booking behind.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email || session.user.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Propose a date and time for the inspection" }, { status: 400 });
  }

  const { tickets, properties, users } = await getCollections();

  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket || !ticket.listingId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not your ticket" }, { status: 403 });
  }
  if (ticket.landlordDecision !== "approved") {
    return NextResponse.json(
      { error: "The landlord hasn't approved this application yet" },
      { status: 409 },
    );
  }

  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!user?.verifiedBadge) {
    return NextResponse.json(
      { error: "Verify your identity before booking an inspection" },
      { status: 403 },
    );
  }

  const listing = await properties.findOne({ _id: ticket.listingId });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const feeNGN = getInspectionFee(listing.location.city);
  const reference = `inspection_${ticket._id}_${Date.now()}`;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: feeNGN * 100,
      reference,
      metadata: {
        kind: "inspection_fee",
        ticketId: ticket._id!.toString(),
        listingId: listing._id!.toString(),
        landlordId: listing.landlordId.toString(),
        tenantId: session.user.id,
        scheduledFor: parsed.data.scheduledFor,
      },
    });

    return NextResponse.json({ authorizationUrl, reference, feeNGN, city: listing.location.city });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
