import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { ProposeInspectionForm } from "@/components/propose-inspection-form";
import { VerifiedBadge } from "@/components/verified-badge";
import { ActiveTenancies } from "@/components/active-tenancies";
import { DashboardHeader, StatGrid, QuickLinks, AccountSettingsLink } from "@/components/dashboard-shell";
import type { ListingStatus } from "@/types/models";

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_verification: "Awaiting inspection & verification",
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

  const { properties, users, agreements } = await getCollections();
  const [listings, user, myAgreements] = await Promise.all([
    properties.find({ landlordId: new ObjectId(session.user.id) }).toArray(),
    users.findOne({ _id: new ObjectId(session.user.id) }),
    agreements.find({ landlordId: new ObjectId(session.user.id) }).toArray(),
  ]);
  const isVerified = Boolean(user?.verifiedBadge);
  const activeCount = myAgreements.filter(
    (a) => a.status === "fully_signed" && !(a.terminatedByLandlord && a.terminatedByTenant),
  ).length;
  const liveListingsCount = listings.filter((l) => l.status === "published").length;
  const awaitingCount = listings.filter((l) => l.status === "pending_verification").length;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <DashboardHeader
        eyebrow="Landlord"
        title="Your listings"
        badge={isVerified && <VerifiedBadge />}
        action={
          isVerified ? (
            <Link
              href="/dashboard/landlord/listings/new"
              className="h-10 rounded-full bg-clay px-5 text-sm font-medium leading-10 text-white"
            >
              List a property
            </Link>
          ) : undefined
        }
      />

      <StatGrid
        stats={[
          { label: "Live listings", value: liveListingsCount },
          { label: "Awaiting inspection", value: awaitingCount, accent: awaitingCount > 0 ? "amber" : undefined },
          { label: "Active tenancies", value: activeCount },
          { label: "Verification", value: isVerified ? "Verified" : "Pending", accent: isVerified ? "verified" : "amber" },
        ]}
      />

      <QuickLinks
        links={[
          { href: "/dashboard/landlord/candidates", label: "Interested tenants" },
          { href: "/dashboard/landlord/tickets", label: "Your messages to Reallow" },
          { href: "/dashboard/landlord/agreements", label: "Tenancy agreements" },
          { href: "/dashboard/landlord/transactions", label: "Transaction history" },
        ]}
      />
      <div className="mt-2">
        <AccountSettingsLink />
      </div>

      {!isVerified && (
        <div className="mt-4 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm">
          <p className="font-medium">Verify your identity to list a property</p>
          <p className="mt-1 text-foreground/70">
            Reallow verifies every landlord&apos;s NIN and BVN before they can publish a listing.
            Listing is free — Reallow&apos;s agent still visits in person to confirm the property
            before it goes live.
          </p>
          <Link href="/dashboard/verify-identity" className="mt-2 inline-block text-clay underline">
            Verify now
          </Link>
        </div>
      )}

      <ActiveTenancies agreements={myAgreements} />

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
                <ProposeInspectionForm listingId={listing._id!.toString()} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
