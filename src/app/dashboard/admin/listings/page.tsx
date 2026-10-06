import Link from "next/link";
import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db";
import { setListingVisibility } from "@/app/dashboard/admin/actions";
import { formatLagos } from "@/lib/time";
import type { ListingStatus, Property } from "@/types/models";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

const TABS: { id: string; label: string; statuses?: ListingStatus[] }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live", statuses: ["published"] },
  { id: "pending", label: "Awaiting verification", statuses: ["pending_verification", "draft"] },
  { id: "hidden", label: "Taken down", statuses: ["archived"] },
  { id: "rented", label: "Rented", statuses: ["rented"] },
  { id: "sold", label: "Sold", statuses: ["sold"] },
  { id: "rejected", label: "Rejected", statuses: ["rejected"] },
];

const STATUS_BADGE: Record<ListingStatus, { label: string; className: string }> = {
  published: { label: "Live", className: "bg-verified/10 text-verified" },
  pending_verification: { label: "Awaiting verification", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  draft: { label: "Draft", className: "bg-foreground/5 text-foreground/60" },
  archived: { label: "Taken down", className: "bg-red-500/10 text-red-600" },
  rented: { label: "Rented", className: "bg-foreground/10 text-foreground/70" },
  sold: { label: "Sold", className: "bg-foreground/10 text-foreground/70" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600" },
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ActionButton({
  listingId,
  action,
  label,
  tone = "neutral",
}: {
  listingId: string;
  action: "show" | "rented" | "sold";
  label: string;
  tone?: "neutral" | "primary";
}) {
  return (
    <form action={setListingVisibility}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton
       
        className={
          tone === "primary"
            ? "h-8 rounded-full bg-clay px-3.5 text-xs font-medium text-white"
            : "h-8 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
        }
      >
        {label}
      </SubmitButton>
    </form>
  );
}

// Every listing on Reallow, with the controls to take one off the site, put it back, or
// mark it rented/sold. The owner is notified of every change.
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab = "all", q } = await searchParams;
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const { properties, users, reports } = await getCollections();

  const filter: Filter<Property> = {};
  if (activeTab.statuses) filter.status = { $in: activeTab.statuses };
  if (q?.trim()) filter.title = new RegExp(escapeRegex(q.trim()), "i");

  const [listings, counts] = await Promise.all([
    properties.find(filter).sort({ updatedAt: -1 }).limit(100).toArray(),
    properties.aggregate<{ _id: ListingStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);
  const countByStatus = new Map(counts.map((c) => [c._id, c.count]));
  const tabCount = (t: (typeof TABS)[number]) =>
    t.statuses ? t.statuses.reduce((sum, s) => sum + (countByStatus.get(s) ?? 0), 0) : counts.reduce((s, c) => s + c.count, 0);

  const [owners, openReports] = await Promise.all([
    listings.length
      ? users.find({ _id: { $in: listings.map((l) => l.landlordId) } }, { projection: { name: 1, phone: 1, status: 1 } }).toArray()
      : [],
    listings.length
      ? reports
          .aggregate<{ _id: string; count: number }>([
            { $match: { targetType: "listing", targetId: { $in: listings.map((l) => l._id!) }, status: { $in: ["open", "reviewing"] } } },
            { $group: { _id: { $toString: "$targetId" }, count: { $sum: 1 } } },
          ])
          .toArray()
      : [],
  ]);
  const ownerById = new Map(owners.map((o) => [o._id!.toString(), o]));
  const reportsByListing = new Map(openReports.map((r) => [r._id, r.count]));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Listings</h1>
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="tab" value={activeTab.id} />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by title"
            className="h-9 w-56 rounded-md border border-line bg-transparent px-3 text-sm"
          />
          <SubmitButton className="h-9 rounded-full border border-line px-4 text-sm font-medium">
            Search
          </SubmitButton>
        </form>
      </div>

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/admin/listings?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
              t.id === activeTab.id ? "border-transparent bg-clay text-white" : "border-line hover:border-clay hover:text-clay"
            }`}
          >
            {t.label} <span className="opacity-70">{tabCount(t)}</span>
          </Link>
        ))}
      </nav>

      {listings.length === 0 && <p className="mt-10 text-foreground/50">No listings here.</p>}

      <div className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line">
        {listings.map((listing) => {
          const id = listing._id!.toString();
          const owner = ownerById.get(listing.landlordId.toString());
          const badge = STATUS_BADGE[listing.status];
          const reportCount = reportsByListing.get(id) ?? 0;
          // Mirrors the checks in setListingVisibility, so the button only appears when it
          // will work (a thrown action error would replace the page with the error screen).
          const previous = listing.takenDown?.previousStatus;
          const everLive =
            Boolean(listing.verification.reviewedAt) || ["published", "rented", "sold"].includes(previous ?? listing.status);
          const restoresToLive = listing.status !== "archived" || !previous || previous === "archived" || previous === "published";
          const showBlockedReason =
            owner?.status === "banned" ? "Unblock the owner to make this visible" : restoresToLive && !everLive ? "Not verified yet" : null;
          const canShow =
            (listing.status === "archived" || listing.status === "rented" || listing.status === "sold") && !showBlockedReason;
          const canClose = listing.status === "published";

          return (
            <div key={id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              {listing.photoUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                <img src={listing.photoUrls[0]} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-28 shrink-0 rounded-lg bg-foreground/5" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/listings/${id}`} className="font-medium break-words hover:text-clay">
                    {listing.title}
                  </Link>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
                  {reportCount > 0 && (
                    <Link
                      href="/dashboard/admin/reports"
                      className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                    >
                      {reportCount} open report{reportCount === 1 ? "" : "s"}
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-foreground/60">
                  {listing.listingType === "rent" ? "For rent" : "For sale"} · ₦{listing.priceNGN.toLocaleString()} ·{" "}
                  {listing.location.city}, {listing.location.state} · updated {formatLagos(listing.updatedAt)}
                </p>
                <p className="mt-0.5 text-xs text-foreground/60">
                  Owner: {owner?.name ?? "Unknown"}
                  {owner?.phone ? (
                    <>
                      {" · "}
                      <a href={`tel:${owner.phone}`} className="text-clay underline">
                        {owner.phone}
                      </a>
                    </>
                  ) : null}
                  {owner?.status === "banned" && <span className="ml-1 font-medium text-red-600">(blocked)</span>}
                </p>
                {listing.takenDown && (
                  <p className="mt-1 text-xs text-red-600">
                    Taken down {formatLagos(listing.takenDown.at)}
                    {listing.takenDown.reason === "owner_blocked" ? " — owner blocked" : ""}
                    {listing.takenDown.note ? ` — “${listing.takenDown.note}”` : ""}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canShow && <ActionButton listingId={id} action="show" label="Make visible" tone="primary" />}
                  {listing.status === "archived" && showBlockedReason && (
                    <span className="text-xs text-foreground/50">{showBlockedReason}</span>
                  )}
                  {canClose && listing.listingType === "rent" && <ActionButton listingId={id} action="rented" label="Mark rented" />}
                  {canClose && listing.listingType === "sale" && <ActionButton listingId={id} action="sold" label="Mark sold" />}
                  {listing.status !== "archived" && (
                    <details className="group">
                      <summary className="flex h-8 cursor-pointer list-none items-center rounded-full border border-red-600/60 px-3.5 text-xs font-medium text-red-600">
                        Take down
                      </summary>
                      <form action={setListingVisibility} className="mt-2 flex flex-wrap gap-2">
                        <input type="hidden" name="listingId" value={id} />
                        <input type="hidden" name="action" value="hide" />
                        <input
                          name="note"
                          maxLength={500}
                          placeholder="Reason (shown to the owner, optional)"
                          className="h-8 w-64 rounded-md border border-line bg-transparent px-2 text-xs"
                        />
                        <SubmitButton className="h-8 rounded-full bg-red-600 px-3.5 text-xs font-medium text-white">
                          Confirm take-down
                        </SubmitButton>
                      </form>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {listings.length === 100 && (
        <p className="mt-3 text-xs text-foreground/50">Showing the 100 most recently updated — search to narrow down.</p>
      )}
    </div>
  );
}
