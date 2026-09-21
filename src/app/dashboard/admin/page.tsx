import { getCollections } from "@/lib/db";
import { approveListing, rejectListing, scheduleInspection } from "./actions";
import { CheckInButton } from "@/components/check-in-button";
import { DashboardHeader, StatGrid, QuickLinks, AccountSettingsLink } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { properties, users, tickets, agreements } = await getCollections();
  const [pending, openTicketCount, payoutPendingCount, refundPendingCount] = await Promise.all([
    properties.find({ status: "pending_verification" }).sort({ createdAt: 1 }).toArray(),
    tickets.countDocuments({ status: { $in: ["open", "in_progress"] } }),
    agreements.countDocuments({ "payment.status": "paid_to_reallow" }),
    agreements.countDocuments({ "payment.refundStatus": "eligible" }),
  ]);

  const landlords = await users
    .find({ _id: { $in: pending.map((listing) => listing.landlordId) } })
    .project({ verifiedBadge: 1 })
    .toArray();
  const verifiedByLandlordId = new Map(
    landlords.map((landlord) => [landlord._id!.toString(), Boolean(landlord.verifiedBadge)]),
  );

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <DashboardHeader
        eyebrow="Admin"
        title="Admin dashboard"
        subtitle="Listing is free for landlords. Approve a listing once the physical inspection confirms it, or reject with a reason."
      />

      <StatGrid
        stats={[
          { label: "Awaiting verification", value: pending.length, accent: pending.length > 0 ? "amber" : undefined },
          { label: "Open support tickets", value: openTicketCount, accent: openTicketCount > 0 ? "clay" : undefined },
          { label: "Payouts pending", value: payoutPendingCount },
          { label: "Refunds pending", value: refundPendingCount },
        ]}
      />

      <QuickLinks
        links={[
          { href: "/dashboard/admin/listings/new", label: "Post a property directly" },
          { href: "/dashboard/admin/agreements", label: "Tenancy agreements" },
          { href: "/dashboard/support", label: "Support queue" },
          { href: "/dashboard/admin/users", label: "Users" },
          { href: "/dashboard/admin/reports", label: "Reports" },
          { href: "/dashboard/admin/referrals", label: "Referrals & withdrawals" },
        ]}
      />
      <div className="mt-2">
        <AccountSettingsLink />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Listings awaiting verification</h2>

      {pending.length === 0 && (
        <p className="mt-4 text-foreground/70">Nothing pending right now.</p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {pending.map((listing) => {
          const landlordVerified = verifiedByLandlordId.get(listing.landlordId.toString()) ?? false;
          return (
          <div key={listing._id!.toString()} className="rounded-lg border border-line p-4">
            <p className="font-medium break-words">{listing.title}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {listing.location.city}, {listing.location.state} · ₦{listing.priceNGN.toLocaleString()}
            </p>
            {listing.fullAddress && (
              <p className="mt-1 text-sm text-foreground/70 break-words">{listing.fullAddress}</p>
            )}
            <p className="mt-1 text-xs text-foreground/50">
              Submitted {new Date(listing.createdAt).toLocaleDateString()}
              {listing.verification.scheduledFor && (
                <> · Inspection scheduled {new Date(listing.verification.scheduledFor).toLocaleDateString()}</>
              )}
              {listing.verification.checkedInAt && (
                <> · Checked in {new Date(listing.verification.checkedInAt).toLocaleString()}</>
              )}
            </p>

            {!landlordVerified && (
              <p className="mt-2 text-xs font-medium text-red-600">
                Landlord hasn&apos;t verified their identity yet — can&apos;t schedule or approve
                until they do.
              </p>
            )}

            {listing.verification.scheduledFor && !listing.verification.checkedInAt && (
              <div className="mt-3">
                <CheckInButton listingId={listing._id!.toString()} />
              </div>
            )}

            <form action={scheduleInspection} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="listingId" value={listing._id!.toString()} />
              <input
                name="scheduledFor"
                type="date"
                defaultValue={
                  listing.verification.scheduledFor
                    ? new Date(listing.verification.scheduledFor).toISOString().slice(0, 10)
                    : undefined
                }
                required
                className="h-9 rounded-md border border-line px-3 text-sm bg-transparent"
              />
              <button
                type="submit"
                disabled={!landlordVerified}
                className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-40"
              >
                Schedule inspection
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <form action={approveListing}>
                <input type="hidden" name="listingId" value={listing._id!.toString()} />
                <button
                  type="submit"
                  disabled={!landlordVerified}
                  className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-40"
                >
                  Approve &amp; publish
                </button>
              </form>

              <form action={rejectListing} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="listingId" value={listing._id!.toString()} />
                <input
                  name="reason"
                  placeholder="Rejection reason"
                  className="h-9 min-w-0 flex-1 rounded-md border border-line px-3 text-sm bg-transparent"
                />
                <button
                  type="submit"
                  className="h-9 rounded-full border border-line px-4 text-sm font-medium"
                >
                  Reject
                </button>
              </form>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
