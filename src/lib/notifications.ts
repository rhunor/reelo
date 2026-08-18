import { getCollections } from "@/lib/db";
import type { Property } from "@/types/models";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Called whenever a listing is published. Finds saved searches (created when a tenant's
// search returned zero results — see /listings) whose criteria the new listing satisfies,
// notifies each matching tenant once, and records that they've been told so a later
// approval of a similar listing doesn't spam them again.
export async function notifySavedSearchMatches(listing: Property): Promise<void> {
  const { savedSearches, notifications } = await getCollections();

  const optionalTextMatch = (path: string, value: string) => ({
    $or: [
      { [path]: { $exists: false } },
      { [path]: null },
      { [path]: new RegExp(`^${escapeRegex(value)}$`, "i") },
    ],
  });

  const candidates = await savedSearches
    .find({
      notifiedListingIds: { $ne: listing._id },
      $and: [
        optionalTextMatch("query.state", listing.location.state),
        optionalTextMatch("query.city", listing.location.city),
        optionalTextMatch("query.propertyType", listing.propertyType),
        {
          $or: [
            { "query.maxPriceNGN": { $exists: false } },
            { "query.maxPriceNGN": null },
            { "query.maxPriceNGN": { $gte: listing.priceNGN } },
          ],
        },
      ],
    })
    .toArray();

  if (candidates.length === 0) return;

  const now = new Date();

  await notifications.insertMany(
    candidates.map((search) => ({
      userId: search.userId,
      type: "saved_search_match" as const,
      title: "A listing matching your search is now available",
      body: listing.title,
      listingId: listing._id,
      read: false,
      createdAt: now,
    })),
  );

  await savedSearches.updateMany(
    { _id: { $in: candidates.map((search) => search._id) } },
    { $push: { notifiedListingIds: listing._id! }, $set: { updatedAt: now } },
  );
}
