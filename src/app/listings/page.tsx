import Image from "next/image";
import Link from "next/link";
import { ObjectId, type Filter } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { ListingsMap, type MapListing } from "@/components/listings-map";
import { ReallowMark } from "@/components/reallow-logo";
import { RevealGroup, RevealItem, HoverLift } from "@/components/reveal";
import { PROPERTY_TYPES, propertyTypeKey } from "@/lib/property-types";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { LocationFilterSelects } from "@/components/location-filter-selects";
import { isStaffRole } from "@/lib/roles";
import type { Property } from "@/types/models";

export const dynamic = "force-dynamic";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ListingsSearchParams {
  state?: string;
  city?: string;
  propertyType?: string;
  listingType?: string;
  maxPrice?: string;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingsSearchParams>;
}) {
  const params = await searchParams;
  const t = await getT();
  const state = params.state?.trim();
  const city = params.city?.trim();
  const propertyType = params.propertyType?.trim();
  const listingType = params.listingType === "rent" || params.listingType === "sale" ? params.listingType : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const hasActiveSearch = Boolean(state || city || propertyType || listingType || maxPrice);

  const filter: Filter<Property> = { status: "published" };
  if (state) filter["location.state"] = new RegExp(`^${escapeRegex(state)}$`, "i");
  if (city) filter["location.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
  if (propertyType) filter.propertyType = new RegExp(`^${escapeRegex(propertyType)}$`, "i");
  if (listingType) filter.listingType = listingType;
  if (maxPrice && !Number.isNaN(maxPrice)) filter.priceNGN = { $lte: maxPrice };

  const { properties, savedSearches } = await getCollections();
  const listings = await properties.find(filter).sort({ createdAt: -1 }).toArray();

  // Zero-result searches are both the signal for "we should notify this user later" and,
  // in aggregate, the record of demand for locations/types Reallow has no supply in yet.
  // Only logged for signed-in, non-staff accounts — there's no one to notify otherwise.
  if (hasActiveSearch && listings.length === 0) {
    const session = await auth();
    if (session?.user && !isStaffRole(session.user.role)) {
      const now = new Date();
      await savedSearches.updateOne(
        {
          userId: new ObjectId(session.user.id),
          "query.state": state,
          "query.city": city,
          "query.propertyType": propertyType,
          "query.listingType": listingType,
          "query.maxPriceNGN": maxPrice,
        },
        {
          $setOnInsert: {
            userId: new ObjectId(session.user.id),
            query: { state, city, propertyType, listingType, maxPriceNGN: maxPrice },
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
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("nav.listings")}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{t("home.rentStep1")}</h1>

      <form method="GET" className="mt-6 flex flex-wrap gap-3">
        <select
          name="listingType"
          defaultValue={listingType ?? ""}
          className="h-10 rounded-full border border-line bg-transparent px-4 text-sm"
        >
          <option value="">{t("listings.rentOrSale")}</option>
          <option value="rent">{t("listing.forRent")}</option>
          <option value="sale">{t("listing.forSale")}</option>
        </select>
        <LocationFilterSelects defaultState={state ?? ""} defaultCity={city ?? ""} />
        <select
          name="propertyType"
          defaultValue={propertyType ?? ""}
          className="h-10 rounded-full border border-line bg-transparent px-4 text-sm"
        >
          <option value="">{t("listings.allTypes")}</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(propertyTypeKey(type) as MessageKey)}
            </option>
          ))}
        </select>
        <input
          name="maxPrice"
          type="number"
          min={0}
          placeholder={t("listings.maxPrice")}
          defaultValue={params.maxPrice}
          className="h-10 w-40 rounded-full border border-line bg-transparent px-4 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("listings.search")}
        </button>
        {hasActiveSearch && (
          <Link
            href="/listings"
            className="flex h-10 items-center px-2 text-sm text-foreground/60 hover:text-clay"
          >
            {t("listings.clear")}
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-foreground/70">
        {t(listings.length === 1 ? "listings.countOne" : "listings.countMany", { count: listings.length })}
      </p>

      {listings.length === 0 && hasActiveSearch && (
        <p className="mt-12 max-w-md text-foreground/60">
          {t("listings.noMatch")}
        </p>
      )}
      {listings.length === 0 && !hasActiveSearch && (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-line px-6 py-16 text-center">
          <ReallowMark className="h-10 w-auto opacity-60" />
          <p className="mt-4 font-display text-xl font-semibold">{t("listings.comingSoon")}</p>
          <p className="mt-2 max-w-sm text-sm text-foreground/60">
            {t("listings.comingSoonBody")}
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
                      {listing.listingType === "rent" ? t("listing.perYear") : ""}
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
