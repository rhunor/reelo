import Link from "next/link";
import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db";
import { formatLagos, LAGOS_TIME_ZONE } from "@/lib/time";
import type { AnalyticsEvent, ConsentEvent } from "@/types/models";

export const dynamic = "force-dynamic";

const PERIODS = [
  { id: "1", label: "Today", days: 1 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
] as const;

function sinceDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

type Row = { _id: string | null; views: number; visitors: number };

// Groups page views by a field: views, plus unique visitors.
function groupBy(field: string, limit: number) {
  return [
    { $group: { _id: `$${field}`, views: { $sum: 1 }, visitorSet: { $addToSet: "$visitorId" } } },
    { $project: { views: 1, visitors: { $size: "$visitorSet" } } },
    { $sort: { views: -1 } },
    { $limit: limit },
  ];
}

// What visitors who accepted analytics cookies did on the site — from the first-party
// page views recorded by /api/track (see /cookies for what's collected and why).
export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodId } = await searchParams;
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[2];
  const since = sinceDays(period.days);
  const { analyticsEvents, consentEvents, users } = await getCollections();
  const match: Filter<AnalyticsEvent> = { createdAt: { $gte: since } };
  const consentMatch: Filter<ConsentEvent> = { createdAt: { $gte: since } };

  const [totalsRaw, daily, pages, sources, devices, browsers, locations, consent, recent] = await Promise.all([
    analyticsEvents
      .aggregate<{ views: number; visitors: number; sessions: number; signedIn: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            views: { $sum: 1 },
            visitorSet: { $addToSet: "$visitorId" },
            sessionSet: { $addToSet: "$sessionId" },
            userSet: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            views: 1,
            visitors: { $size: "$visitorSet" },
            sessions: { $size: "$sessionSet" },
            signedIn: { $size: { $filter: { input: "$userSet", cond: { $ne: ["$$this", null] } } } },
          },
        },
      ])
      .toArray(),
    analyticsEvents
      .aggregate<Row>([
        { $match: match },
        { $set: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: LAGOS_TIME_ZONE } } } },
        ...groupBy("day", 120).slice(0, 2),
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    analyticsEvents.aggregate<Row>([{ $match: match }, ...groupBy("path", 15)]).toArray(),
    // Sources count sessions' entry pages only — later pages in a visit say "(same session)".
    analyticsEvents.aggregate<Row>([{ $match: { ...match, newSession: true } }, ...groupBy("source", 12)]).toArray(),
    analyticsEvents.aggregate<Row>([{ $match: match }, ...groupBy("device", 3)]).toArray(),
    analyticsEvents.aggregate<Row>([{ $match: match }, ...groupBy("browser", 6)]).toArray(),
    analyticsEvents
      .aggregate<Row>([
        { $match: match },
        {
          $set: {
            place: {
              $cond: [
                { $ifNull: ["$city", false] },
                { $concat: ["$city", ", ", { $ifNull: ["$country", ""] }] },
                { $ifNull: ["$country", "Unknown"] },
              ],
            },
          },
        },
        ...groupBy("place", 12),
      ])
      .toArray(),
    consentEvents
      .aggregate<{ _id: string; count: number }>([{ $match: consentMatch }, { $group: { _id: "$choice", count: { $sum: 1 } } }])
      .toArray(),
    analyticsEvents.find(match).sort({ createdAt: -1 }).limit(25).toArray(),
  ]);

  const totals = totalsRaw[0] ?? { views: 0, visitors: 0, sessions: 0, signedIn: 0 };
  const accepted = consent.find((c) => c._id === "all")?.count ?? 0;
  const essentialOnly = consent.find((c) => c._id === "essential")?.count ?? 0;
  const consentTotal = accepted + essentialOnly;
  const recentUserIds = recent.flatMap((e) => (e.userId ? [e.userId] : []));
  const recentUsers = recentUserIds.length
    ? await users.find({ _id: { $in: recentUserIds } }, { projection: { name: 1 } }).toArray()
    : [];
  const nameOf = new Map(recentUsers.map((u) => [u._id!.toString(), u.name]));
  const maxDaily = Math.max(1, ...daily.map((d) => d.views));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Site analytics</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Page views from visitors who accepted analytics cookies. Reallow staff pages aren&apos;t counted.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/admin/analytics?period=${p.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              p.id === period.id ? "border-transparent bg-clay text-white" : "border-line hover:border-clay hover:text-clay"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [totals.views, "Page views"],
          [totals.visitors, "Unique visitors"],
          [totals.sessions, "Visits (sessions)"],
          [totals.sessions ? (totals.views / totals.sessions).toFixed(1) : "—", "Pages per visit"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-line p-4">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-foreground/60">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-line p-5">
        <h2 className="text-sm font-semibold">Page views per day</h2>
        {daily.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">No page views in this period yet.</p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-1">
            {daily.map((d) => (
              <div key={d._id} className="group relative flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-clay/80 group-hover:bg-clay"
                  style={{ height: `${Math.max(2, (d.views / maxDaily) * 100)}%` }}
                />
                <span className="pointer-events-none absolute -top-6 hidden rounded bg-foreground px-1.5 py-0.5 text-[10px] whitespace-nowrap text-background group-hover:block">
                  {d._id}: {d.views} views
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Breakdown title="Top pages" rows={pages} />
        <Breakdown title="Where visitors came from" rows={sources} unit="visits" />
        <Breakdown title="Locations" rows={locations} />
        <div className="flex flex-col gap-6">
          <Breakdown title="Devices" rows={devices} />
          <Breakdown title="Browsers" rows={browsers} />
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-line p-5">
        <h2 className="text-sm font-semibold">Cookie choices</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Answers to the cookie banner in this period. Only &quot;Accept all&quot; visitors appear in the numbers above.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xl font-semibold tabular-nums">{accepted}</p>
            <p className="text-xs text-foreground/60">Accepted all</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">{essentialOnly}</p>
            <p className="text-xs text-foreground/60">Essential only</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">
              {consentTotal ? `${Math.round((accepted / consentTotal) * 100)}%` : "—"}
            </p>
            <p className="text-xs text-foreground/60">Acceptance rate</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground/50">
          {totals.signedIn} signed-in account{totals.signedIn === 1 ? "" : "s"} visited in this period.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-line p-5">
        <h2 className="text-sm font-semibold">Latest page views</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">Nothing yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-foreground/50">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">When</th>
                  <th className="py-1.5 pr-3 font-medium">Page</th>
                  <th className="py-1.5 pr-3 font-medium">Source</th>
                  <th className="py-1.5 pr-3 font-medium">Device</th>
                  <th className="py-1.5 pr-3 font-medium">Location</th>
                  <th className="py-1.5 font-medium">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((e) => (
                  <tr key={e._id!.toString()}>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-foreground/60">{formatLagos(e.createdAt)}</td>
                    <td className="py-1.5 pr-3 font-mono break-all">{e.path}</td>
                    <td className="py-1.5 pr-3">{e.source}</td>
                    <td className="py-1.5 pr-3 capitalize">{e.device}</td>
                    <td className="py-1.5 pr-3">{[e.city, e.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="py-1.5">
                      {e.userId ? (
                        <Link href={`/dashboard/admin/users/${e.userId}`} className="hover:text-clay">
                          {nameOf.get(e.userId.toString()) ?? "Account"}
                        </Link>
                      ) : (
                        <span className="text-foreground/40">Guest</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Breakdown({ title, rows, unit = "views" }: { title: string; rows: Row[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <section className="rounded-2xl border border-line p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/50">No data yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row._id ?? "unknown"}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{row._id ?? "Unknown"}</span>
                <span className="shrink-0 tabular-nums text-foreground/70">
                  {row.views} <span className="text-xs text-foreground/50">{unit} · {row.visitors} visitors</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-foreground/5">
                <div className="h-1.5 rounded-full bg-clay" style={{ width: `${(row.views / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
