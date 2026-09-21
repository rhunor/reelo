import { getCollections } from "@/lib/db";
import { adminVerifyUser } from "@/app/dashboard/admin/actions";
import { VerifiedBadge } from "@/components/verified-badge";

export const dynamic = "force-dynamic";

// Testing-only tool: manually mark a user's identity verified without a real Youverify
// call, so the verified-user flows (applying to a listing, booking inspections) can be
// exercised. See adminVerifyUser in ./actions.ts.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { users } = await getCollections();

  const filter = q ? { email: new RegExp(q.trim(), "i") } : {};
  const results = await users.find(filter).sort({ createdAt: -1 }).limit(50).toArray();

  // Flagged, never auto-acted on — a shared first+last name across accounts is a common
  // early signal of multi-accounting/fraud worth a human look, computed across the whole
  // user base (not just this page) so two matches on different search pages still flag.
  const nameCounts = await users
    .aggregate<{ _id: string; count: number }>([
      { $match: { firstName: { $exists: true }, lastName: { $exists: true } } },
      {
        $group: {
          _id: { $concat: [{ $toLower: "$firstName" }, " ", { $toLower: "$lastName" }] },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  const duplicateNames = new Set(nameCounts.map((n) => n._id));

  // Admin-only visibility, per the locked decision — referred users never see this
  // themselves, and neither does the referrer.
  const referrerIds = results.filter((u) => u.referredBy).map((u) => u.referredBy!);
  const referrers = referrerIds.length ? await users.find({ _id: { $in: referrerIds } }).toArray() : [];
  const referrerById = new Map(referrers.map((r) => [r._id!.toString(), r]));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Search by email. &quot;Mark identity verified&quot; bypasses the real NIN/BVN checks —
        for testing only.
      </p>

      <form method="GET" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email"
          className="h-10 flex-1 rounded-md border border-line bg-transparent px-3 text-sm"
        />
        <button type="submit" className="h-10 rounded-full border border-line px-4 text-sm font-medium">
          Search
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {results.map((user) => {
          const nameKey =
            user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.toLowerCase() : null;
          const isDuplicateName = nameKey ? duplicateNames.has(nameKey) : false;
          const referrer = user.referredBy ? referrerById.get(user.referredBy.toString()) : null;

          return (
          <div
            key={user._id!.toString()}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{user.name}</p>
                {user.verifiedBadge && <VerifiedBadge />}
                {isDuplicateName && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                    ⚠ Shares a name with another account
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/60">
                {user.email} · {user.role}
              </p>
              {referrer && (
                <p className="mt-1 inline-block rounded-full bg-clay/10 px-2 py-0.5 text-xs font-medium text-clay">
                  Referred by {referrer.name} ({referrer.role === "staff" ? "Staff" : "Public"})
                </p>
              )}
            </div>
            {!user.verifiedBadge && (
              <form action={adminVerifyUser}>
                <input type="hidden" name="userId" value={user._id!.toString()} />
                <button
                  type="submit"
                  className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white"
                >
                  Mark identity verified
                </button>
              </form>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
