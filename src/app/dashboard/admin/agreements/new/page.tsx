import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { NewAgreementForm } from "@/components/new-agreement-form";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";

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

  const selectedListing =
    listingId && ObjectId.isValid(listingId)
      ? await properties.findOne({ _id: new ObjectId(listingId) })
      : null;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Create tenancy agreement</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Reallow generates the agreement once a landlord and tenant have agreed terms; both parties
        sign it in-app.
      </p>

      {selectedListing && (
        <div className="mt-6 rounded-lg border border-line p-4 text-sm">
          <p className="font-medium">{selectedListing.title}</p>
          <p className="mt-1 text-foreground/70">
            Listing caution fee: ₦{(selectedListing.depositNGN ?? 0).toLocaleString()} · Minimum
            term: {selectedListing.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS} months
          </p>
          {selectedListing.dealBreakers && selectedListing.dealBreakers.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Deal breakers to include</p>
              <p className="mt-1 text-foreground/70">{selectedListing.dealBreakers.join(", ")}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-foreground/50">
        <p className="font-medium text-foreground/70">Listing IDs:</p>
        {listings.map((listing) => (
          <p key={listing._id!.toString()}>
            {listing._id!.toString()} — {listing.title}
          </p>
        ))}
      </div>

      <NewAgreementForm
        listingId={listingId}
        minimumTermMonths={selectedListing?.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS}
      />
    </div>
  );
}
