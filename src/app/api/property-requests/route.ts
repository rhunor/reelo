import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { findDistrict, SUPPORTED_STATES } from "@/lib/locations";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { notifyPropertyRequest } from "@/lib/notifications";
import { CONTACT_INFO_ERROR, noContactInfo } from "@/lib/contact-guard";

const schema = z.object({
  listingType: z.enum(["rent", "sale"]),
  propertyType: z.enum(PROPERTY_TYPES),
  state: z.string().min(2),
  city: z.string().optional(),
  maxBudgetNGN: z.coerce.number().int().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  // Free text goes to Reallow staff only, but still mustn't carry contact details.
  details: z.string().trim().max(1000).optional().refine((v) => !v || noContactInfo(v), CONTACT_INFO_ERROR),
  // Guests only — signed-in requests use the account's details.
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  website: z.string().optional(), // honeypot
});

const MAX_OPEN_PER_DAY = 5;

// "Not finding what you want?" on /listings: ask Reallow's agents to find a property.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form and try again" }, { status: 400 });
  }
  const data = parsed.data;
  if (data.website) return NextResponse.json({ success: true }); // bot — pretend it worked

  if (!SUPPORTED_STATES.some((s) => s.value === data.state)) {
    return NextResponse.json({ error: "Pick a state Reallow covers" }, { status: 400 });
  }
  if (data.city && !findDistrict(data.state, data.city)) {
    return NextResponse.json({ error: "Pick an area from the list" }, { status: 400 });
  }

  const session = await auth();
  const { users, propertyRequests } = await getCollections();
  let name = data.name;
  let phone = data.phone;
  let email = data.email || undefined;
  let userId: ObjectId | undefined;

  if (session?.user?.id && ObjectId.isValid(session.user.id)) {
    const user = await users.findOne({ _id: new ObjectId(session.user.id) }, { projection: { name: 1, phone: 1, email: 1 } });
    if (user) {
      userId = user._id;
      name = user.name;
      phone = user.phone;
      email = user.email;
    }
  }
  if (!userId) {
    if (!name || name.length < 2) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
    if (!phone || !/^\+?[\d\s-]{10,16}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a phone number Reallow can reach you on" }, { status: 400 });
    }
  }

  // A simple brake on spam: a handful of requests per person per day.
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const recent = await propertyRequests.countDocuments({
    createdAt: { $gte: since },
    ...(userId ? { userId } : { phone }),
  });
  if (recent >= MAX_OPEN_PER_DAY) {
    return NextResponse.json({ error: "You've sent several requests today — Reallow will be in touch soon" }, { status: 429 });
  }

  const now = new Date();
  const doc = {
    userId,
    name: name!,
    phone,
    email,
    listingType: data.listingType,
    propertyType: data.propertyType,
    state: data.state,
    city: data.city || undefined,
    maxBudgetNGN: data.maxBudgetNGN,
    bedrooms: data.bedrooms,
    details: data.details || undefined,
    status: "new" as const,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await propertyRequests.insertOne(doc);
  await notifyPropertyRequest({ ...doc, _id: insertedId });

  return NextResponse.json({ success: true });
}
