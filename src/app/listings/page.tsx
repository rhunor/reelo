import Image from "next/image";
import Link from "next/link";
import { ObjectId, type Filter } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { ListingsMap, type MapListing } from "@/components/listings-map";
import { ReallowMark } from "@/components/reallow-logo";
import { RevealGroup, RevealItem, HoverLift } from "@/components/reveal";
import type { Property } from "@/types/models";

export const dynamic = "force-dynamic";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ListingsSearchParams {
  state?: string;
  city?: string;
  propertyType?: string;
  maxPrice?: string;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingsSearchParams>;
}) {
  const params = await searchParams;
  const state = params.state?.trim();
  const city = params.city?.trim();
  const propertyType = params.propertyType?.trim();
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const hasActiveSearch = Boolean(state || city || propertyType || maxPrice);

  const filter: Filter<Property> = { status: "published" };
  if (state) filter["location.state"] = new RegExp(`^${escapeRegex(state)}$`, "i");
  if (city) filter["location.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
  if (propertyType) filter.propertyType = new RegExp(`^${escapeRegex(propertyType)}$`, "i");
  if (maxPrice && !Number.isNaN(maxPrice)) filter.priceNGN = { $lte: maxPrice };

  const { properties, savedSearches } = await getCollections();
  const listings = await properties.find(filter).sort({ createdAt: -1 }).toArray();

  // Zero-result searches are both the signal for "we should notify this tenant later"
  // and, in aggregate, the record of demand for locations/types Reallow has no supply
  // in yet. Only logged for signed-in tenants — there's no one to notify otherwise.
  if (hasActiveSearch && listings.length === 0) {
    const session = await auth();
    if (session?.user?.role === "tenant") {
      const now = new Date();
      await savedSearches.updateOne(
        {
          userId: new ObjectId(session.user.id),
          "query.state": state,
          "query.city": city,
          "query.propertyType": propertyType,
          "query.maxPriceNGN": maxPrice,
        },
        {
          $setOnInsert: {
            userId: new ObjectId(session.user.id),
            query: { state, city, propertyType, maxPriceNGN: maxPrice },
            notifiedListingIds: [],
            createdAt: now,
          },
          $set: { resultCountAtSearch: 0, updatedAt: now },
        },
        { upsert: true },
      );
    }
  }

  const mapListings: MapListing[] = listings
    .filter((listing) => listing.location.coordinates)
    .map((listing) => ({
      id: listing._id!.toString(),
      title: listing.title,
      priceNGN: listing.priceNGN,
      listingType: listing.listingType,
      lng: listing.location.coordinates![0],
      lat: listing.location.coordinates![1],
    }));

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Listings</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Browse verified properties</h1>

      <form method="GET" className="mt-6 flex flex-wrap gap-3">
        <input
          name="state"
          placeholder="State"
          defaultValue={state}
          className="h-10 rounded-full border border-line bg-transparent px-4 text-sm"
        />
        <input
          name="city"
          placeholder="City"
          defaultValue={city}
          className="h-10 rounded-full border border-line bg-transparent px-4 text-sm"
        />
        <input
          name="propertyType"
          placeholder="Property type"
          defaultValue={propertyType}
          className="h-10 rounded-full border border-line bg-transparent px-4 text-sm"
        />
        <input
          name="maxPrice"
          type="number"
          min={0}
          placeholder="Max price (₦)"
          defaultValue={params.maxPrice}
          className="h-10 w-40 rounded-full border border-line bg-transparent px-4 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Search
        </button>
        {hasActiveSearch && (
          <Link
            href="/listings"
            className="flex h-10 items-center px-2 text-sm text-foreground/60 hover:text-clay"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-foreground/70">
        {listings.length} propert{listings.length === 1 ? "y" : "ies"} available — free to browse.
        Upgrade to Pro or Pro+ to contact Reallow about a listing or book an inspection.
      </p>

      {listings.length === 0 && hasActiveSearch && (
        <p className="mt-12 max-w-md text-foreground/60">
          Nothing matches yet.{" "}
          {"We've saved this search — if a listing like this appears, we'll notify you."}
        </p>
      )}
      {listings.length === 0 && !hasActiveSearch && (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-line px-6 py-16 text-center">
          <ReallowMark className="h-10 w-auto opacity-60" />
          <p className="mt-4 font-display text-xl font-semibold">More listings coming soon</p>
          <p className="mt-2 max-w-sm text-sm text-foreground/60">
            Landlords are getting verified and properties are being inspected right now. Stay
            updated — new listings will show up here as soon as they&apos;re approved.
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-2">
          {listings.map((listing) => (
            <RevealItem key={listing._id!.toString()}>
              <HoverLift>
                <Link
                  href={`/listings/${listing._id}`}
                  className="group block overflow-hidden rounded-2xl border border-line transition-colors hover:border-clay hover:shadow-lg"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden">
                    <Image
                      src={listing.photoUrls[0]}
                      alt={listing.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-medium">{listing.title}</p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {listing.location.area ? `${listing.location.area}, ` : ""}
                      {listing.location.city}, {listing.location.state}
                    </p>
                    <p className="mt-2 font-mono font-medium">
                      ₦{listing.priceNGN.toLocaleString()}
                      {listing.listingType === "rent" ? "/year" : ""}
                    </p>
                  </div>
                </Link>
              </HoverLift>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="h-125 lg:sticky lg:top-24 lg:col-span-2 lg:h-[calc(100vh-8rem)]">
          <ListingsMap listings={mapListings} />
        </div>
      </div>
    </div>
  );
}
