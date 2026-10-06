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
    role: "user",
    name: "Reallow",
    email: REALLOW_LANDLORD_EMAIL,
    nin: { status: "verified" },
    verifiedBadge: true,
    createdAt: now,
    updatedAt: now,
  });

  return insertedId;
}

// Is this the system "Reallow" owner? Listings it owns are managed by Reallow's admins,
// who act as the landlord for them (applications, accept/decline, meeting requests).
export async function isReallowOwned(landlordId: ObjectId): Promise<boolean> {
  const { users } = await getCollections();
  const owner = await users.findOne({ _id: landlordId }, { projection: { email: 1 } });
  return owner?.email === REALLOW_LANDLORD_EMAIL;
}

// May this signed-in user act as the landlord of a listing? Its real owner always can;
// admins can for Reallow-owned listings.
export async function canActAsLandlord(
  landlordId: ObjectId,
  viewer: { id: string; role?: string } | undefined,
): Promise<boolean> {
  if (!viewer) return false;
  if (landlordId.toString() === viewer.id) return true;
  return viewer.role === "admin" && (await isReallowOwned(landlordId));
}

// Who should hear about things addressed to a listing's landlord: the landlord themselves,
// or — for Reallow-owned listings, whose owner account nobody logs into — every admin.
export async function landlordRecipients(landlordId: ObjectId): Promise<ObjectId[]> {
  if (!(await isReallowOwned(landlordId))) return [landlordId];
  const { users } = await getCollections();
  const admins = await users.find({ role: "admin" }, { projection: { _id: 1 } }).toArray();
  return admins.map((a) => a._id!);
}
