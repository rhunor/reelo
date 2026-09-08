import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";

// verifiedBadge means "NIN and BVN both verified" — always recomputed fresh from both
// fields rather than set directly from a single check's result, so that verifying NIN
// after BVN (or vice versa) can't silently flip the badge on without the other actually
// having succeeded. Real money moves to real names once this is true, so it has to be
// correct in both directions, not just able to turn on.
export async function recomputeVerifiedBadge(userId: ObjectId): Promise<boolean> {
  const { users } = await getCollections();
  const user = await users.findOne({ _id: userId });
  if (!user) return false;

  const verifiedBadge = user.nin.status === "verified" && user.bvn?.status === "verified";

  await users.updateOne({ _id: userId }, { $set: { verifiedBadge, updatedAt: new Date() } });

  return verifiedBadge;
}
