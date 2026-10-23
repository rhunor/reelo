import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { canActAsLandlord } from "@/lib/reallow-landlord";
import { getServiceChargeRate } from "@/lib/fees";
import { formatDimensions } from "@/lib/property-types";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";
import { notifyPaymentRequested } from "@/lib/notifications";
import type { Agreement } from "@/types/models";

const schema = z.object({
  ticketId: z.string(),
  leaseStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  leaseTermMonths: z.coerce.number().int().positive().max(120).optional(),
});

// After meeting an accepted applicant, the landlord asks them to pay. This creates the
// tenancy (or sale) agreement from the listing's own terms, already signed by the landlord
// side — asking for payment *is* their acceptance — and tells the applicant, who signs and
// pays from /agreements/[id]. A landlord can ask several applicants for the same property:
// the first payment to complete wins (see lib/agreement-payment.ts).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !ObjectId.isValid(parsed.data.ticketId)) {
    return NextResponse.json({ error: "Check the details and try again" }, { status: 400 });
  }

  const { tickets, properties, users, agreements } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(parsed.data.ticketId) });
  if (!ticket?.listingId) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (ticket.withdrawnAt) return NextResponse.json({ error: "This application was withdrawn" }, { status: 409 });
  const listing = await properties.findOne({ _id: ticket.listingId });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (!(await canActAsLandlord(listing.landlordId, session.user))) {
    return NextResponse.json({ error: "This isn't your property" }, { status: 403 });
  }
  if (listing.status !== "published") {
    return NextResponse.json({ error: "This property is no longer available" }, { status: 409 });
  }
  const decision = ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined);
  if (decision !== "approved") {
    return NextResponse.json({ error: "Accept this applicant before requesting payment" }, { status: 409 });
  }

  const open = await agreements.findOne({
    listingId: listing._id,
    tenantId: ticket.userId,
    status: { $nin: ["superseded", "cancelled"] },
    "payment.status": "unpaid",
  });
  if (open) {
    return NextResponse.json({ error: "You've already asked this applicant to pay", id: open._id!.toString() }, { status: 409 });
  }

  const isSale = listing.listingType === "sale";
  const minimumMonths = listing.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS;
  const termMonths = parsed.data.leaseTermMonths ?? minimumMonths;
  if (!isSale && termMonths < minimumMonths) {
    return NextResponse.json({ error: `This listing requires at least ${minimumMonths} months` }, { status: 400 });
  }
  const leaseStart = parsed.data.leaseStart ? new Date(`${parsed.data.leaseStart}T00:00:00+01:00`) : new Date();
  if (!isSale && Number.isNaN(leaseStart.getTime())) {
    return NextResponse.json({ error: "Pick a start date" }, { status: 400 });
  }

  const [landlord, tenant, me] = await Promise.all([
    users.findOne({ _id: listing.landlordId }, { projection: { name: 1 } }),
    users.findOne({ _id: ticket.userId }, { projection: { name: 1 } }),
    users.findOne({ _id: new ObjectId(session.user.id) }, { projection: { name: 1 } }),
  ]);
  const district = [listing.location.area, listing.location.city, listing.location.state].filter(Boolean).join(", ");
  const now = new Date();
  // Reallow staff requesting on an owner's behalf sign as Reallow.
  const signerName = session.user.id === listing.landlordId.toString() ? (landlord?.name ?? "Landlord") : `${me?.name ?? "Reallow"} for Reallow`;
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";

  const agreement: Agreement = {
    kind: isSale ? "sale" : "tenancy",
    ticketId: ticket._id,
    ...(listing.agreementDocument
      ? { document: { url: listing.agreementDocument.url, name: listing.agreementDocument.name } }
      : {}),
    paymentRequestedAt: now,
    listingId: listing._id!,
    landlordId: listing.landlordId,
    tenantId: ticket.userId,
    templateVersion: isSale ? "sale-v1" : "v2",
    terms: {
      listingType: isSale ? "sale" : "rent",
      rentNGN: listing.priceNGN,
      depositNGN: isSale ? 0 : (listing.depositNGN ?? 0),
      estateChargeNGN: isSale ? undefined : listing.estateChargeNGN,
      state: listing.location.state,
      serviceChargeRate: getServiceChargeRate(isSale ? "sale" : "rent"),
      leaseStart,
      leaseEndOrTermMonths: isSale ? 0 : termMonths,
      responsibilities: "",
      houseRules: listing.dealBreakers ?? [],
      propertyAddress: listing.fullAddress?.trim() || district,
      propertyDescription: [
        [listing.bedrooms ? `${listing.bedrooms}-bedroom` : null, listing.propertyType].filter(Boolean).join(" "),
        listing.dimensions ? formatDimensions(listing.dimensions) : null,
      ]
        .filter(Boolean)
        .join(", "),
      landlordName: landlord?.name,
      tenantName: tenant?.name,
    },
    status: "signed_by_landlord",
    signatures: [
      {
        party: "landlord",
        signedAt: now,
        signatureHash: createHash("sha256").update(`${signerName}|${session.user.id}|${now.toISOString()}`).digest("hex"),
        ipAddress,
        fullName: signerName,
      },
    ],
    payment: { status: "unpaid" },
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await agreements.insertOne(agreement);
  await notifyPaymentRequested({ ...agreement, _id: insertedId });

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
