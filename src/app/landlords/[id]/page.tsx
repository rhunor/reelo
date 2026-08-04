import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LandlordProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const { users, properties } = await getCollections();
  const landlord = await users.findOne({ _id: new ObjectId(id), role: "landlord" });
  if (!landlord) notFound();

  const listings = await properties.find({ landlordId: landlord._id, status: "published" }).toArray();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{landlord.name}</h1>
        {landlord.verifiedBadge && (
          <span className="rounded-full bg-verified/10 px-2 py-1 text-xs font-medium text-verified">
            Verified
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-foreground/70">
        {landlord.ratingCount
          ? `${landlord.ratingAverage!.toFixed(1)}/5 from ${landlord.ratingCount} review${landlord.ratingCount === 1 ? "" : "s"}`
          : "No reviews yet"}
      </p>

      <h2 className="mt-8 text-lg font-medium">Listings</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {listings.map((listing) => (
          <Link
            key={listing._id!.toString()}
            href={`/listings/${listing._id}`}
            className="rounded-lg border border-line p-4"
          >
            <p className="font-medium">{listing.title}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {listing.location.city}, {listing.location.state}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
