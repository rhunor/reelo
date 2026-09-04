import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { VerifiedBadge } from "@/components/verified-badge";
import { RevealGroup, RevealItem, HoverLift } from "@/components/reveal";

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
        {landlord.verifiedBadge && <VerifiedBadge />}
      </div>
      <p className="mt-1 text-sm text-foreground/70">
        {landlord.ratingCount
          ? `${landlord.ratingAverage!.toFixed(1)}/5 from ${landlord.ratingCount} review${landlord.ratingCount === 1 ? "" : "s"}`
          : "No reviews yet"}
      </p>

      <h2 className="mt-8 text-lg font-medium">Listings</h2>
      <RevealGroup className="mt-4 grid gap-4 sm:grid-cols-2">
        {listings.map((listing) => (
          <RevealItem key={listing._id!.toString()}>
            <HoverLift>
              <Link
                href={`/listings/${listing._id}`}
                className="block rounded-lg border border-line p-4 transition-colors hover:border-clay"
              >
                <p className="font-medium">{listing.title}</p>
                <p className="mt-1 text-sm text-foreground/70">
                  {listing.location.city}, {listing.location.state}
                </p>
              </Link>
            </HoverLift>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
