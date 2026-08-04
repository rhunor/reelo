import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z.object({
  listingId: z.string(),
  tenantEmail: z.string().email(),
  rentNGN: z.coerce.number().positive(),
  depositNGN: z.coerce.number().nonnegative(),
  leaseStart: z.string(),
  leaseTermMonths: z.coerce.number().int().positive(),
  responsibilities: z.string().min(10),
});

// Reelo organizes everything between landlord and tenant, so admin — not the landlord —
// creates the agreement, referencing the tenant by the email Reelo already has on file
// from coordinating the deal.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const { properties, users, agreements } = await getCollections();

  const listing = await properties.findOne({ _id: new ObjectId(parsed.data.listingId) });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const tenant = await users.findOne({ email: parsed.data.tenantEmail.toLowerCase(), role: "tenant" });
  if (!tenant) {
    return NextResponse.json({ error: "No tenant found with that email" }, { status: 404 });
  }

  const now = new Date();
  const { insertedId } = await agreements.insertOne({
    listingId: listing._id!,
    landlordId: listing.landlordId,
    tenantId: tenant._id!,
    templateVersion: "v1",
    terms: {
      rentNGN: parsed.data.rentNGN,
      depositNGN: parsed.data.depositNGN,
      leaseStart: new Date(parsed.data.leaseStart),
      leaseEndOrTermMonths: parsed.data.leaseTermMonths,
      responsibilities: parsed.data.responsibilities,
    },
    status: "sent",
    signatures: [],
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
