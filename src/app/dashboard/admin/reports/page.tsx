import Link from "next/link";
import { getCollections } from "@/lib/db";
import { banUser, unbanUser, archiveListing, updateReportStatus } from "@/app/dashboard/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { reports, users, properties } = await getCollections();

  const openReports = await reports.find({ status: { $in: ["open", "reviewing"] } }).sort({ createdAt: -1 }).toArray();

  const userTargetIds = openReports.filter((r) => r.targetType === "user").map((r) => r.targetId);
  const listingTargetIds = openReports.filter((r) => r.targetType === "listing").map((r) => r.targetId);
  const reporterIds = openReports.map((r) => r.reporterId);

  const [targetUsers, targetListings, reporters] = await Promise.all([
    userTargetIds.length ? users.find({ _id: { $in: userTargetIds } }).toArray() : [],
    listingTargetIds.length ? properties.find({ _id: { $in: listingTargetIds } }).toArray() : [],
    reporterIds.length ? users.find({ _id: { $in: reporterIds } }).toArray() : [],
  ]);
  const userById = new Map(targetUsers.map((u) => [u._id!.toString(), u]));
  const listingById = new Map(targetListings.map((l) => [l._id!.toString(), l]));
  const reporterById = new Map(reporters.map((u) => [u._id!.toString(), u]));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Reports on users or listings, filed by anyone using Reallow.
      </p>

      {openReports.length === 0 && <p className="mt-8 text-foreground/50">Nothing open right now.</p>}

      <div className="mt-8 flex flex-col gap-4">
        {openReports.map((report) => {
          const reporter = reporterById.get(report.reporterId.toString());
          const targetUser = report.targetType === "user" ? userById.get(report.targetId.toString()) : null;
          const targetListing =
            report.targetType === "listing" ? listingById.get(report.targetId.toString()) : null;

          return (
            <div key={report._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="text-xs text-foreground/50">
                Reported by {reporter?.name ?? "a user"} · {new Date(report.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 font-medium">{report.reason}</p>
              {report.details && <p className="mt-1 text-sm text-foreground/70 break-words">{report.details}</p>}

              <div className="mt-2 text-sm">
                {targetUser && (
                  <p>
                    Target: {targetUser.name} ({targetUser.email}) — {targetUser.role}
                    {targetUser.status === "banned" && (
                      <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                        Banned
                      </span>
                    )}
                  </p>
                )}
                {targetListing && (
                  <p>
                    Target listing:{" "}
                    <Link href={`/listings/${targetListing._id}`} className="underline">
                      {targetListing.title}
                    </Link>
                    {targetListing.status === "archived" && (
                      <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                        Archived
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {targetUser && targetUser.status !== "banned" && (
                  <form action={banUser}>
                    <input type="hidden" name="userId" value={targetUser._id!.toString()} />
                    <button type="submit" className="h-9 rounded-full border border-red-600 px-4 text-sm font-medium text-red-600">
                      Ban user
                    </button>
                  </form>
                )}
                {targetUser && targetUser.status === "banned" && (
                  <form action={unbanUser}>
                    <input type="hidden" name="userId" value={targetUser._id!.toString()} />
                    <button type="submit" className="h-9 rounded-full border border-line px-4 text-sm font-medium">
                      Unban user
                    </button>
                  </form>
                )}
                {targetListing && targetListing.status !== "archived" && (
                  <form action={archiveListing}>
                    <input type="hidden" name="listingId" value={targetListing._id!.toString()} />
                    <button type="submit" className="h-9 rounded-full border border-red-600 px-4 text-sm font-medium text-red-600">
                      Remove listing
                    </button>
                  </form>
                )}

                <form action={updateReportStatus}>
                  <input type="hidden" name="reportId" value={report._id!.toString()} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button type="submit" className="h-9 rounded-full border border-line px-4 text-sm font-medium">
                    Dismiss
                  </button>
                </form>
                <form action={updateReportStatus}>
                  <input type="hidden" name="reportId" value={report._id!.toString()} />
                  <input type="hidden" name="status" value="resolved" />
                  <button type="submit" className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white">
                    Mark resolved
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
