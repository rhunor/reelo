import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";
import { capCautionFee } from "@/lib/fees";

const schema = z.object({
  listingId: z.string(),
  tenantEmail: z.string().email(),
  rentNGN: z.coerce.number().positive(),
  depositNGN: z.coerce.number().nonnegative(),
  estateChargeNGN: z.coerce.number().positive().optional(),
  leaseStart: z.string(),
  leaseTermMonths: z.coerce.number().int().positive(),
  responsibilities: z.string().min(10),
});

// Reallow organizes everything between landlord and tenant, so admin — not the landlord —
// creates the agreement, referencing the tenant by the email Reallow already has on file
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

  // Validated against this specific listing's own terms, not just the platform floor —
  // a landlord can require a longer minimum tenancy than the 6-month floor, and the
  // caution fee is capped relative to whatever rent is actually being agreed here.
  const requiredMinimumMonths = listing.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS;
  if (parsed.data.leaseTermMonths < requiredMinimumMonths) {
    return NextResponse.json(
      { error: `This listing requires a minimum tenancy of ${requiredMinimumMonths} months` },
      { status: 400 },
    );
  }
  if (!capCautionFee(parsed.data.depositNGN, parsed.data.rentNGN)) {
    return NextResponse.json({ error: "Caution fee can't exceed 12% of annual rent" }, { status: 400 });
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
      estateChargeNGN: parsed.data.estateChargeNGN,
      leaseStart: new Date(parsed.data.leaseStart),
      leaseEndOrTermMonths: parsed.data.leaseTermMonths,
      responsibilities: parsed.data.responsibilities,
    },
    status: "sent",
    signatures: [],
    payment: { status: "unpaid" },
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
