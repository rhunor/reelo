import Link from "next/link";
import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db";
import { HEARD_ABOUT_OPTIONS, heardAboutLabel } from "@/lib/acquisition";
import { formatLagos } from "@/lib/time";
import type { User } from "@/types/models";

export const dynamic = "force-dynamic";

const PERIODS = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
] as const;

function sinceDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

// Where new sign-ups say they heard about Reallow — to decide where advertising money goes.
export default async function AdminInsightsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodId } = await searchParams;
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[0];
  const { users } = await getCollections();

  const match: Filter<User> = { role: { $in: ["user", "tenant", "landlord"] } };
  if (period.days) match.createdAt = { $gte: sinceDays(period.days) };

  const [bySource, totalSignups, recentDetails] = await Promise.all([
    users
      .aggregate<{ _id: string | null; count: number }>([
        { $match: match },
        { $group: { _id: "$heardAbout.source", count: { $sum: 1 } } },
      ])
      .toArray(),
    users.countDocuments(match),
    users
      .find({ ...match, "heardAbout.detail": { $exists: true } }, { projection: { name: 1, heardAbout: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray(),
  ]);

  const answered = bySource.filter((s) => s._id).reduce((sum, s) => sum + s.count, 0);
  const unanswered = totalSignups - answered;
  const rows = HEARD_ABOUT_OPTIONS.map((option) => ({
    ...option,
    count: bySource.find((s) => s._id === option.value)?.count ?? 0,
  })).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">How people found Reallow</h1>
      <p className="mt-1 text-sm text-foreground/60">
        From the &ldquo;How did you hear about us?&rdquo; question at signup — which channels bring people in.
      </p>

      <nav className="mt-6 flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/admin/insights?period=${p.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              p.id === period.id ? "border-transparent bg-clay text-white" : "border-line hover:border-clay hover:text-clay"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-2xl font-semibold tabular-nums">{totalSignups}</p>
          <p className="text-xs text-foreground/60">Sign-ups</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-2xl font-semibold tabular-nums">{answered}</p>
          <p className="text-xs text-foreground/60">Answered the question</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-line p-4 sm:col-span-1">
          <p className="text-2xl font-semibold">{rows[0]?.count ? rows[0].label : "—"}</p>
          <p className="text-xs text-foreground/60">Top channel</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-line p-5">
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const share = answered ? Math.round((row.count / answered) * 100) : 0;
            return (
              <li key={row.value}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums text-foreground/70">
                    {row.count} <span className="text-xs text-foreground/50">({share}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-foreground/5">
                  <div className="h-2 rounded-full bg-clay" style={{ width: `${(row.count / max) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        {unanswered > 0 && (
          <p className="mt-4 text-xs text-foreground/50">
            {unanswered} account{unanswered === 1 ? "" : "s"} in this period signed up before this question existed.
          </p>
        )}
      </section>

      {recentDetails.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line p-5">
          <h2 className="text-sm font-semibold">What people wrote</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {recentDetails.map((u) => (
              <li key={u._id!.toString()}>
                <Link href={`/dashboard/admin/users/${u._id}`} className="hover:text-clay">
                  &ldquo;{u.heardAbout!.detail}&rdquo;
                </Link>
                <span className="text-xs text-foreground/50">
                  {" "}
                  · {heardAboutLabel(u.heardAbout!.source)} · {formatLagos(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
