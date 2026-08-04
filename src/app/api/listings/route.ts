import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { LISTING_VERIFICATION_FEE_NGN } from "@/lib/listing-verification";

const listingSchema = z.object({
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
  photoUrls: z.array(z.string().url()).min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "landlord") {
    return NextResponse.json({ error: "Only landlords can create listings" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const { properties } = await getCollections();
  const now = new Date();

  const { insertedId } = await properties.insertOne({
    landlordId: new ObjectId(session.user.id),
    title: data.title,
    description: data.description,
    listingType: data.listingType,
    propertyType: data.propertyType,
    priceNGN: data.priceNGN,
    depositNGN: data.depositNGN,
    location: { state: data.state, city: data.city, area: data.area },
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    furnishing: data.furnishing,
    amenities: data.amenities
      ? data.amenities.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    photoUrls: data.photoUrls,
    status: "draft",
    verification: { feeNGN: LISTING_VERIFICATION_FEE_NGN },
    viewsCount: 0,
    savesCount: 0,
    inquiriesCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
