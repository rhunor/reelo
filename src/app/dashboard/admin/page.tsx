import Link from "next/link";
import { getCollections } from "@/lib/db";
import { approveListing, rejectListing, scheduleInspection } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { properties } = await getCollections();
  const pending = await properties.find({ status: "pending_verification" }).sort({ "verification.paidAt": 1 }).toArray();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Listings awaiting verification</h1>
      <p className="mt-2 text-foreground/70">
        These landlords have paid the ₦15,000 in-person inspection fee. Approve once the physical
        inspection confirms the listing, or reject with a reason.
      </p>

      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/dashboard/admin/agreements" className="underline">
          Tenancy agreements
        </Link>
        <Link href="/dashboard/support" className="underline">
          Support queue
        </Link>
      </div>

      {pending.length === 0 && (
        <p className="mt-8 text-foreground/70">Nothing pending right now.</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {pending.map((listing) => (
          <div key={listing._id!.toString()} className="rounded-lg border border-line p-4">
            <p className="font-medium">{listing.title}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {listing.location.city}, {listing.location.state} · ₦{listing.priceNGN.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-foreground/50 dark:text-foreground/50">
              Paid {listing.verification.paidAt ? new Date(listing.verification.paidAt).toLocaleDateString() : "—"}
              {listing.verification.scheduledFor && (
                <> · Inspection scheduled {new Date(listing.verification.scheduledFor).toLocaleDateString()}</>
              )}
            </p>

            <form action={scheduleInspection} className="mt-3 flex items-center gap-2">
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
                className="h-9 rounded-full border border-line px-4 text-sm font-medium"
              >
                Schedule inspection
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <form action={approveListing}>
                <input type="hidden" name="listingId" value={listing._id!.toString()} />
                <button
                  type="submit"
                  className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white"
                >
                  Approve &amp; publish
                </button>
              </form>

              <form action={rejectListing} className="flex items-center gap-2">
                <input type="hidden" name="listingId" value={listing._id!.toString()} />
                <input
                  name="reason"
                  placeholder="Rejection reason"
                  className="h-9 rounded-md border border-line px-3 text-sm bg-transparent"
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
        ))}
      </div>
    </div>
  );
}
