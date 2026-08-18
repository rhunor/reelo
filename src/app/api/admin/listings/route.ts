import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { geocodeLocation } from "@/lib/mapbox";
import { notifySavedSearchMatches } from "@/lib/notifications";

const listingSchema = z.object({
  landlordEmail: z.string().email(),
  title: z.string().min(5),
  description: z.string().min(20),
  listingType: z.enum(["rent", "sale"]),
  propertyType: z.string().min(2),
  priceNGN: z.coerce.number().positive(),
  depositNGN: z.coerce.number().positive().optional(),
  state: z.string().min(2),
  city: z.string().min(2),
  area: z.string().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  furnishing: z.enum(["furnished", "semi_furnished", "unfurnished"]).optional(),
  amenities: z.string().optional(),
  tenantPreferences: z.string().max(500).optional(),
  photoUrls: z.array(z.string().url()).min(1),
});

// Admin can post a property directly, on behalf of a landlord who already has an account —
// this skips the ₦15,000 fee and in-person inspection entirely and goes straight to
// `published`, since the admin is vouching for it themselves. Landlord verification is
// deliberately NOT required here (unlike the self-serve POST /api/listings flow) — that's
// the point of the admin bypass.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const { properties, users } = await getCollections();

  const landlord = await users.findOne({ email: data.landlordEmail.toLowerCase(), role: "landlord" });
  if (!landlord) {
    return NextResponse.json({ error: "No landlord found with that email" }, { status: 404 });
  }

  const now = new Date();
  const geocodeQuery = [data.area, data.city, data.state, "Nigeria"].filter(Boolean).join(", ");
  const coordinates = await geocodeLocation(geocodeQuery);

  const { insertedId } = await properties.insertOne({
    landlordId: landlord._id!,
    title: data.title,
    description: data.description,
    listingType: data.listingType,
    propertyType: data.propertyType,
    priceNGN: data.priceNGN,
    depositNGN: data.depositNGN,
    location: {
      state: data.state,
      city: data.city,
      area: data.area,
      coordinates: coordinates ?? undefined,
    },
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    furnishing: data.furnishing,
    amenities: data.amenities
      ? data.amenities.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    tenantPreferences: data.tenantPreferences,
    photoUrls: data.photoUrls,
    status: "published",
    verification: {
      feeNGN: 0,
      paymentReference: "admin-created",
      paidAt: now,
      reviewedBy: new ObjectId(session.user.id),
      reviewedAt: now,
    },
    viewsCount: 0,
    savesCount: 0,
    inquiriesCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  const listing = await properties.findOne({ _id: insertedId });
  if (listing) await notifySavedSearchMatches(listing);

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
