import Link from "next/link";
import { getCollections } from "@/lib/db";
import { banUser, setListingVisibility, unbanUser, updateReportStatus } from "@/app/dashboard/admin/actions";
import { formatLagos } from "@/lib/time";
import type { ReportStatus } from "@/types/models";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

const TABS: { id: string; label: string; statuses: ReportStatus[] }[] = [
  { id: "open", label: "New", statuses: ["open"] },
  { id: "reviewing", label: "Investigating", statuses: ["reviewing"] },
  { id: "closed", label: "Closed", statuses: ["resolved", "dismissed"] },
];

function PhoneLink({ phone }: { phone?: string }) {
  return phone ? (
    <a href={`tel:${phone}`} className="text-clay underline">
      {phone}
    </a>
  ) : (
    <span className="text-foreground/40">no phone</span>
  );
}

// Reports filed by users on properties or other users. New → Investigating → Resolved /
// Dismissed, with internal notes along the way and the take-down / block controls inline.
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "open" } = await searchParams;
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const { reports, users, properties } = await getCollections();

  const [list, counts] = await Promise.all([
    reports
      .find({ status: { $in: activeTab.statuses } })
      .sort({ createdAt: activeTab.id === "closed" ? -1 : 1 })
      .limit(100)
      .toArray(),
    reports.aggregate<{ _id: ReportStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);
  const countFor = (t: (typeof TABS)[number]) => counts.filter((c) => t.statuses.includes(c._id)).reduce((s, c) => s + c.count, 0);

  const listingIds = list.filter((r) => r.targetType === "listing").map((r) => r.targetId);
  const targetListings = listingIds.length ? await properties.find({ _id: { $in: listingIds } }).toArray() : [];
  const listingById = new Map(targetListings.map((l) => [l._id!.toString(), l]));
  const userIds = [
    ...list.map((r) => r.reporterId),
    ...list.filter((r) => r.targetType === "user").map((r) => r.targetId),
    ...targetListings.map((l) => l.landlordId),
  ];
  const relatedUsers = userIds.length ? await users.find({ _id: { $in: userIds } }).toArray() : [];
  const userById = new Map(relatedUsers.map((u) => [u._id!.toString(), u]));

  // How many open reports each target has in total — repeat reports are a strong signal.
  const repeatCounts = await reports
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: ["open", "reviewing"] }, targetId: { $in: list.map((r) => r.targetId) } } },
      { $group: { _id: { $toString: "$targetId" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const repeatByTarget = new Map(repeatCounts.map((r) => [r._id, r.count]));

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Reports on properties and users, filed by people using Reallow. Notes are internal — reporters never see them.
      </p>

      <nav className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/admin/reports?tab=${t.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              t.id === activeTab.id ? "border-transparent bg-clay text-white" : "border-line hover:border-clay hover:text-clay"
            }`}
          >
            {t.label} <span className="opacity-70">{countFor(t)}</span>
          </Link>
        ))}
      </nav>

      {list.length === 0 && <p className="mt-10 text-foreground/50">Nothing here.</p>}

      <div className="mt-6 flex flex-col gap-4">
        {list.map((report) => {
          const reporter = userById.get(report.reporterId.toString());
          const listing = report.targetType === "listing" ? listingById.get(report.targetId.toString()) : undefined;
          const targetUser =
            report.targetType === "user"
              ? userById.get(report.targetId.toString())
              : listing
                ? userById.get(listing.landlordId.toString())
                : undefined;
          const repeats = repeatByTarget.get(report.targetId.toString()) ?? 0;
          const isOpen = report.status === "open" || report.status === "reviewing";

          return (
            <div key={report._id!.toString()} className="rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">
                    {report.targetType === "listing" ? "Property report" : "User report"}
                    {repeats > 1 && <span className="ml-2 normal-case text-amber-600">· {repeats} open reports on this</span>}
                  </p>
                  <p className="mt-1 font-semibold">{report.reason}</p>
                </div>
                <p className="text-xs text-foreground/50">{formatLagos(report.createdAt)}</p>
              </div>
              {report.details && <p className="mt-2 text-sm break-words text-foreground/80">{report.details}</p>}

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-foreground/5 p-3">
                  <dt className="text-xs text-foreground/50">Reported by</dt>
                  <dd className="mt-0.5">
                    {reporter?.name ?? "Unknown"}
                    <span className="block text-xs text-foreground/60">
                      {reporter?.email} · <PhoneLink phone={reporter?.phone} />
                    </span>
                  </dd>
                </div>
                <div className="rounded-xl bg-foreground/5 p-3">
                  <dt className="text-xs text-foreground/50">{listing ? "Property & owner" : "Reported user"}</dt>
                  <dd className="mt-0.5">
                    {listing && (
                      <Link href={`/listings/${listing._id}`} className="block font-medium underline">
                        {listing.title}
                        <span className="ml-1 text-xs font-normal text-foreground/50">({listing.status.replace("_", " ")})</span>
                      </Link>
                    )}
                    {targetUser ? (
                      <>
                        {targetUser.name}
                        {targetUser.status === "banned" && <span className="ml-1 text-xs font-medium text-red-600">(blocked)</span>}
                        <span className="block text-xs text-foreground/60">
                          {targetUser.email} · <PhoneLink phone={targetUser.phone} />
                        </span>
                      </>
                    ) : (
                      <span className="text-foreground/50">No longer exists</span>
                    )}
                  </dd>
                </div>
              </dl>

              {report.adminNote && (
                <p className="mt-3 rounded-xl border border-dashed border-line p-3 text-sm">
                  <span className="text-xs font-medium text-foreground/50">Internal note: </span>
                  {report.adminNote}
                </p>
              )}
              {!isOpen && report.resolvedAt && (
                <p className="mt-2 text-xs text-foreground/50">
                  {report.status === "resolved" ? "Resolved" : "Dismissed"} {formatLagos(report.resolvedAt)}
                </p>
              )}

              {/* Act on the target */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {listing && listing.status !== "archived" && (
                  <form action={setListingVisibility}>
                    <input type="hidden" name="listingId" value={listing._id!.toString()} />
                    <input type="hidden" name="action" value="hide" />
                    <input type="hidden" name="note" value="Taken down while Reallow investigates a report." />
                    <SubmitButton className="h-8 rounded-full border border-red-600/60 px-3.5 text-xs font-medium text-red-600">
                      Take listing down
                    </SubmitButton>
                  </form>
                )}
                {listing && listing.status === "archived" && targetUser?.status !== "banned" && (
                  <form action={setListingVisibility}>
                    <input type="hidden" name="listingId" value={listing._id!.toString()} />
                    <input type="hidden" name="action" value="show" />
                    <SubmitButton className="h-8 rounded-full border border-line px-3.5 text-xs font-medium">
                      Put listing back up
                    </SubmitButton>
                  </form>
                )}
                {targetUser && targetUser.role !== "admin" && targetUser.status !== "banned" && (
                  <form action={banUser}>
                    <input type="hidden" name="userId" value={targetUser._id!.toString()} />
                    <input type="hidden" name="reason" value={`Report: ${report.reason}`} />
                    <SubmitButton className="h-8 rounded-full border border-red-600/60 px-3.5 text-xs font-medium text-red-600">
                      Block {listing ? "owner" : "user"}
                    </SubmitButton>
                  </form>
                )}
                {targetUser && targetUser.status === "banned" && (
                  <form action={unbanUser}>
                    <input type="hidden" name="userId" value={targetUser._id!.toString()} />
                    <SubmitButton className="h-8 rounded-full border border-line px-3.5 text-xs font-medium">
                      Unblock {listing ? "owner" : "user"}
                    </SubmitButton>
                  </form>
                )}
              </div>

              {/* Move the report along */}
              {isOpen && (
                <form action={updateReportStatus} className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                  <input type="hidden" name="reportId" value={report._id!.toString()} />
                  <textarea
                    name="adminNote"
                    rows={2}
                    maxLength={1000}
                    defaultValue={report.adminNote}
                    placeholder="Investigation notes (internal)"
                    className="rounded-md border border-line bg-transparent px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {report.status === "open" && (
                      <SubmitButton
                        name="status"
                        value="reviewing"
                        className="h-8 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
                      >
                        Start investigating
                      </SubmitButton>
                    )}
                    {report.status === "reviewing" && (
                      <SubmitButton
                        name="status"
                        value="reviewing"
                        className="h-8 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
                      >
                        Save note
                      </SubmitButton>
                    )}
                    <SubmitButton name="status" value="dismissed" className="h-8 rounded-full border border-line px-3.5 text-xs font-medium">
                      Dismiss
                    </SubmitButton>
                    <SubmitButton name="status" value="resolved" className="h-8 rounded-full bg-clay px-3.5 text-xs font-medium text-white">
                      Mark resolved
                    </SubmitButton>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
