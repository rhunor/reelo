import { getCollections } from "@/lib/db";
import type { ObjectId } from "mongodb";

const REALLOW_LANDLORD_EMAIL = "reallow@reallow.test";

// Admin-posted listings don't always have a real landlord account behind them yet (e.g.
// Reallow's own inventory, or a landlord who hasn't registered). Rather than blocking the
// admin on that, these listings get attributed to a single system "Reallow" landlord
// account, created lazily on first use. It has no password — it's not a real login, just a
// placeholder owner so `landlordId` stays a valid reference (public landlord profile,
// reviews, etc. all keep working).
export async function getOrCreateReallowLandlordId(): Promise<ObjectId> {
  const { users } = await getCollections();

  const existing = await users.findOne({ email: REALLOW_LANDLORD_EMAIL });
  if (existing) return existing._id!;

  const now = new Date();
  const { insertedId } = await users.insertOne({
    role: "landlord",
    name: "Reallow",
    email: REALLOW_LANDLORD_EMAIL,
    nin: { status: "verified" },
    verifiedBadge: true,
    createdAt: now,
    updatedAt: now,
  });

  return insertedId;
}
