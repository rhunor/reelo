import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { findDistrict } from "@/lib/locations";
import { capCautionFee } from "@/lib/fees";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";
import { isStaffRole } from "@/lib/roles";

const listingSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  listingType: z.enum(["rent", "sale"]),
  propertyType: z.string().min(2),
  priceNGN: z.coerce.number().positive(),
  depositNGN: z.coerce.number().positive().optional(),
  estateChargeNGN: z.coerce.number().positive().optional(),
  minimumTermMonths: z.coerce.number().int().min(MINIMUM_LEASE_TERM_MONTHS).optional(),
  dealBreakers: z.string().optional(),
  fullAddress: z.string().min(5).optional(),
  state: z.string().min(2),
  city: z.string().min(2),
  area: z.string().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  furnishing: z.enum(["furnished", "semi_furnished", "unfurnished"]).optional(),
  amenities: z.string().optional(),
  tenantPreferences: z.string().max(500).optional(),
  photoUrls: z.array(z.string().url()).min(1),
  videoUrls: z.array(z.string().url()).optional(),
  // The landlord proposes when Reallow's agent should come verify the property in person —
  // there's no fee for this anymore, so there's no reason to sit in an unpaid "draft" limbo
  // first; a submission goes straight into the admin's pending-verification queue.
  scheduledFor: z.string().min(1, "Propose a date for the verification inspection"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Staff accounts can't list properties this way" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const { properties } = await getCollections();
  const now = new Date();

  // Creating a listing no longer requires the landlord's identity to already be verified —
  // that gate now lives at approval/scheduling time instead (see
  // src/app/dashboard/admin/actions.ts), so a landlord can start listing while their KYC
  // is still in progress. It just won't get scheduled for verification until that's done.

  // state/city come from a closed dropdown (src/lib/locations.ts), not free text, so the
  // coordinates are a known-good constant rather than a geocoder's best guess — this is
  // what actually fixes listings landing in the wrong spot on the map.
  const district = findDistrict(data.state, data.city);
  if (!district) {
    return NextResponse.json({ error: "Unsupported location — pick a state/city Reallow supports" }, { status: 400 });
  }

  if (data.listingType === "rent" && data.depositNGN && !capCautionFee(data.depositNGN, data.priceNGN)) {
    return NextResponse.json(
      { error: "Caution fee can't exceed 12% of annual rent" },
      { status: 400 },
    );
  }

  const { insertedId } = await properties.insertOne({
    landlordId: new ObjectId(session.user.id),
    title: data.title,
    description: data.description,
    listingType: data.listingType,
    propertyType: data.propertyType,
    priceNGN: data.priceNGN,
    depositNGN: data.depositNGN,
    estateChargeNGN: data.estateChargeNGN,
    minimumTermMonths: data.minimumTermMonths,
    dealBreakers: data.dealBreakers
      ? data.dealBreakers.split(",").map((item) => item.trim()).filter(Boolean)
      : undefined,
    fullAddress: data.fullAddress,
    location: {
      state: data.state,
      city: data.city,
      area: data.area,
      coordinates: district.coordinates,
    },
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    furnishing: data.furnishing,
    amenities: data.amenities
      ? data.amenities.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    tenantPreferences: data.tenantPreferences,
    photoUrls: data.photoUrls,
    videoUrls: data.videoUrls ?? [],
    status: "pending_verification",
    verification: { feeNGN: 0, scheduledFor: new Date(data.scheduledFor) },
    viewsCount: 0,
    savesCount: 0,
    inquiriesCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
