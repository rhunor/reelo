import Image from "next/image";
import Link from "next/link";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const { properties } = await getCollections();
  const listings = await properties.find({ status: "published" }).sort({ createdAt: -1 }).toArray();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Listings</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Browse verified properties</h1>
      <p className="mt-3 max-w-lg text-foreground/70">
        {listings.length} propert{listings.length === 1 ? "y" : "ies"} available — free to browse.
        Upgrade to Pro or Pro+ to contact Reelo about a listing or book an inspection.
      </p>

      {listings.length === 0 && (
        <p className="mt-12 text-foreground/50">No listings are published yet — check back soon.</p>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Link
            key={listing._id!.toString()}
            href={`/listings/${listing._id}`}
            className="group overflow-hidden rounded-2xl border border-line transition-colors hover:border-clay"
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
        ))}
      </div>
    </div>
  );
}
