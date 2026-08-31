import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z.object({
  listingId: z.string(),
  scheduledFor: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "tenant") {
    return NextResponse.json({ error: "Only tenants can book inspections" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success || !ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { users, properties, inspectionBookings } = await getCollections();

  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.verifiedBadge) {
    return NextResponse.json(
      { error: "Verify your identity before booking an inspection" },
      { status: 403 },
    );
  }

  const listing = await properties.findOne({ _id: new ObjectId(parsed.data.listingId) });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const now = new Date();

  await inspectionBookings.insertOne({
    listingId: listing._id!,
    landlordId: listing.landlordId,
    tenantId: user._id!,
    scheduledFor: new Date(parsed.data.scheduledFor),
    status: "requested",
    createdAt: now,
  });

  return NextResponse.json({ success: true });
}
