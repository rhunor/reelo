import { getCollections } from "@/lib/db";
import { NewAgreementForm } from "@/components/new-agreement-form";

export const dynamic = "force-dynamic";

export default async function NewAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const { listingId } = await searchParams;
  const { properties } = await getCollections();
  const listings = await properties
    .find({ status: { $in: ["published", "pending_verification"] } })
    .project({ title: 1 })
    .toArray();

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Create tenancy agreement</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Reallow generates the agreement once a landlord and tenant have agreed terms; both parties
        sign it in-app.
      </p>

      <div className="mt-6 text-xs text-foreground/50">
        <p className="font-medium text-foreground/70">Listing IDs:</p>
        {listings.map((listing) => (
          <p key={listing._id!.toString()}>
            {listing._id!.toString()} — {listing.title}
          </p>
        ))}
      </div>

      <NewAgreementForm listingId={listingId} />
    </div>
  );
}
