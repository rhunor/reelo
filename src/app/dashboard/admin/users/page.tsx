import Link from "next/link";
import type { Filter, Sort } from "mongodb";
import { getCollections } from "@/lib/db";
import { CreateStaffAccountForm } from "@/components/create-staff-account-form";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { ROLE_LABEL } from "@/lib/roles";
import { formatLagos } from "@/lib/time";
import type { User } from "@/types/models";

export const dynamic = "force-dynamic";

const TABS: { id: string; label: string; filter: Filter<User> }[] = [
  { id: "users", label: "Users", filter: { role: { $in: ["user", "tenant", "landlord"] } } },
  { id: "staff", label: "Field staff", filter: { role: "staff" } },
  { id: "support", label: "Support", filter: { role: "support" } },
  { id: "admins", label: "Admins", filter: { role: "admin" } },
  { id: "blocked", label: "Blocked", filter: { status: "banned" } },
  { id: "all", label: "Everyone", filter: {} },
];

const SORTS: { id: string; label: string; sort: Sort }[] = [
  { id: "newest", label: "Newest first", sort: { createdAt: -1 } },
  { id: "oldest", label: "Oldest first", sort: { createdAt: 1 } },
  { id: "name", label: "Name A–Z", sort: { name: 1 } },
];

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; sort?: string; base?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.find((t) => t.id === params.tab) ?? TABS[0]!;
  const sort = SORTS.find((s) => s.id === params.sort) ?? SORTS[0]!;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim();
  const { users } = await getCollections();

  const filter: Filter<User> = { ...tab.filter };
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ email: pattern }, { name: pattern }, { phone: pattern }];
  }
  if ((tab.id === "staff" || tab.id === "support") && params.base) filter.staffBase = params.base as User["staffBase"];

  const [results, total, tabCounts, nameCounts] = await Promise.all([
    users
      .find(filter, { projection: { passwordHash: 0, emailVerificationToken: 0, "nin.value": 0, "bvn.value": 0 } })
      .sort(sort.sort)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    users.countDocuments(filter),
    Promise.all(TABS.map((t) => users.countDocuments(t.filter))),
    // A shared first+last name across accounts is an early fraud/multi-account signal —
    // flagged for a human look, never acted on automatically.
    users
      .aggregate<{ _id: string }>([
        { $match: { firstName: { $exists: true }, lastName: { $exists: true } } },
        { $group: { _id: { $concat: [{ $toLower: "$firstName" }, " ", { $toLower: "$lastName" }] }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray(),
  ]);
  const duplicateNames = new Set(nameCounts.map((n) => n._id));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const link = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { tab: tab.id, sort: sort.id, q, base: params.base, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    return `/dashboard/admin/users?${next.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">People</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Open anyone to see how they use Reallow, change their role, block them, or leave notes.
      </p>

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <Link
            key={t.id}
            href={link({ tab: t.id, page: undefined, base: undefined })}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
              t.id === tab.id ? "border-transparent bg-clay text-white" : "border-line hover:border-clay hover:text-clay"
            }`}
          >
            {t.label} <span className="opacity-70">{tabCounts[i]}</span>
          </Link>
        ))}
      </nav>

      <form method="GET" className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={tab.id} />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, email, or phone"
          className="h-10 min-w-0 flex-1 rounded-md border border-line bg-transparent px-3 text-sm"
        />
        {(tab.id === "staff" || tab.id === "support") && (
          <select name="base" defaultValue={params.base ?? ""} className="h-10 rounded-md border border-line bg-transparent px-2 text-sm">
            <option value="">All cities</option>
            <option value="Abuja">Abuja</option>
            <option value="Port Harcourt">Port Harcourt</option>
            <option value="Warri">Warri</option>
          </select>
        )}
        <select name="sort" defaultValue={sort.id} className="h-10 rounded-md border border-line bg-transparent px-2 text-sm">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-full border border-line px-4 text-sm font-medium">
          Apply
        </button>
      </form>

      {tab.id === "staff" && (
        <details className="mt-6 rounded-2xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">+ Create a field staff account</summary>
          <p className="mt-2 text-xs text-foreground/50">
            Or open an existing person and change their role to Field staff.
          </p>
          <CreateStaffAccountForm />
        </details>
      )}

      <p className="mt-6 text-xs text-foreground/50">
        {total} {total === 1 ? "person" : "people"}
        {pages > 1 && ` · page ${page} of ${pages}`}
      </p>
      <div className="mt-2 flex flex-col divide-y divide-line rounded-2xl border border-line">
        {results.length === 0 && <p className="p-6 text-sm text-foreground/50">Nobody matches.</p>}
        {results.map((user) => {
          const nameKey = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.toLowerCase() : null;
          return (
            <Link
              key={user._id!.toString()}
              href={`/dashboard/admin/users/${user._id}`}
              className="flex items-center gap-3 p-4 hover:bg-foreground/[0.03]"
            >
              <UserAvatar name={user.name} pictureUrl={user.profile?.profilePictureUrl} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{user.name}</span>
                  {user.verifiedBadge && <VerifiedBadge />}
                  {user.role !== "user" && user.role !== "tenant" && user.role !== "landlord" && (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold tracking-wide text-background uppercase">
                      {ROLE_LABEL[user.role]}
                    </span>
                  )}
                  {user.staffBase && (
                    <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">📍 {user.staffBase}</span>
                  )}
                  {user.status === "banned" && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600">Blocked</span>
                  )}
                  {nameKey && duplicateNames.has(nameKey) && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                      ⚠ Shared name
                    </span>
                  )}
                  {user.referredBy && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">Referred</span>
                  )}
                </div>
                <p className="truncate text-xs text-foreground/60">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ""}
                </p>
              </div>
              <span className="hidden shrink-0 text-right text-xs text-foreground/50 sm:block">
                Joined
                <br />
                {formatLagos(user.createdAt).split(",")[0]}
              </span>
            </Link>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex justify-between text-sm">
          {page > 1 ? (
            <Link href={link({ page: String(page - 1) })} className="text-clay hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={link({ page: String(page + 1) })} className="text-clay hover:underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
