import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { ListingVerificationPayButton } from "@/components/listing-verification-pay-button";
import { VerifiedBadge } from "@/components/verified-badge";
import type { ListingStatus } from "@/types/models";

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft — payment needed",
  pending_verification: "Awaiting admin verification",
  published: "Live",
  rejected: "Rejected",
  rented: "Rented",
  sold: "Sold",
  archived: "Archived",
};

const STATUS_COLOR: Record<ListingStatus, string> = {
  draft: "text-foreground/50",
  pending_verification: "text-amber-600",
  published: "text-green-600",
  rejected: "text-red-600",
  rented: "text-foreground/50",
  sold: "text-foreground/50",
  archived: "text-foreground/50",
};

export const dynamic = "force-dynamic";

export default async function LandlordDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { properties, users } = await getCollections();
  const [listings, user] = await Promise.all([
    properties.find({ landlordId: new ObjectId(session.user.id) }).toArray(),
    users.findOne({ _id: new ObjectId(session.user.id) }),
  ]);
  const isVerified = Boolean(user?.verifiedBadge);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Your listings</h1>
          {isVerified && <VerifiedBadge />}
        </div>
        {isVerified ? (
          <Link
            href="/dashboard/landlord/listings/new"
            className="h-10 rounded-full bg-clay px-5 text-sm font-medium leading-10 text-white"
          >
            List a property
          </Link>
        ) : (
          <Link
            href="/dashboard/verify-identity"
            className="h-10 rounded-full border border-clay px-5 text-sm font-medium leading-10 text-clay"
          >
            Verify to list a property
          </Link>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm">
          <p className="font-medium">Verify your identity to list a property</p>
          <p className="mt-1 text-foreground/70">
            Reallow verifies every landlord against the NIN database before they can publish a
            listing — this is separate from the ₦15,000 in-person inspection fee.
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/dashboard/landlord/candidates" className="underline">
          Interested tenants
        </Link>
        <Link href="/dashboard/landlord/tickets" className="underline">
          Your messages to Reallow
        </Link>
        <Link href="/dashboard/landlord/agreements" className="underline">
          Tenancy agreements
        </Link>
      </div>

      {listings.length === 0 && (
        <p className="mt-8 text-foreground/70">
          You haven&apos;t listed a property yet.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {listings.map((listing) => (
          <div key={listing._id!.toString()} className="rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium break-words">{listing.title}</p>
                <p className="mt-1 text-sm text-foreground/70">
                  {listing.location.city}, {listing.location.state}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-medium ${STATUS_COLOR[listing.status]}`}>
                {STATUS_LABEL[listing.status]}
              </span>
            </div>

            {listing.status === "pending_verification" && listing.verification.scheduledFor && (
              <p className="mt-2 text-sm text-amber-600">
                Inspection scheduled for {new Date(listing.verification.scheduledFor).toLocaleDateString()}
              </p>
            )}

            {(listing.status === "draft" || listing.status === "rejected") && (
              <div className="mt-4">
                {listing.status === "rejected" && listing.verification.rejectionReason && (
                  <p className="mb-2 text-sm text-red-600">
                    Rejected: {listing.verification.rejectionReason}
                  </p>
                )}
                <ListingVerificationPayButton
                  listingId={listing._id!.toString()}
                  feeNGN={listing.verification.feeNGN}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
