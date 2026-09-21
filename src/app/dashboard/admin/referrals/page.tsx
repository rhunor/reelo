import { getCollections } from "@/lib/db";
import {
  approveReferralCommission,
  rejectReferralCommission,
  markWithdrawalPaid,
  rejectWithdrawal,
} from "@/app/dashboard/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const { referralCommissions, withdrawalRequests, users } = await getCollections();

  const [pendingCommissions, pendingWithdrawals] = await Promise.all([
    referralCommissions.find({ status: "pending" }).sort({ createdAt: 1 }).toArray(),
    withdrawalRequests.find({ status: "pending" }).sort({ createdAt: 1 }).toArray(),
  ]);

  const userIds = [
    ...pendingCommissions.flatMap((c) => [c.referrerId, c.referredUserId]),
    ...pendingWithdrawals.map((w) => w.userId),
  ];
  const relatedUsers = userIds.length ? await users.find({ _id: { $in: userIds } }).toArray() : [];
  const userById = new Map(relatedUsers.map((u) => [u._id!.toString(), u]));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Referrals &amp; withdrawals</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Nothing here credits or pays out automatically — every commission and withdrawal
        needs a manual look first.
      </p>

      <h2 className="mt-8 text-lg font-medium">Pending commissions</h2>
      {pendingCommissions.length === 0 && (
        <p className="mt-2 text-sm text-foreground/50">Nothing pending.</p>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {pendingCommissions.map((commission) => {
          const referrer = userById.get(commission.referrerId.toString());
          const referred = userById.get(commission.referredUserId.toString());
          return (
            <div key={commission._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="text-sm">
                <strong>{referrer?.name ?? "Unknown"}</strong> ({referrer?.role}) referred{" "}
                <strong>{referred?.name ?? "Unknown"}</strong>
              </p>
              <p className="mt-1 font-mono text-lg">₦{commission.amountNGN.toLocaleString()}</p>
              <p className="mt-1 text-xs text-foreground/50">
                {new Date(commission.createdAt).toLocaleString()}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={approveReferralCommission}>
                  <input type="hidden" name="commissionId" value={commission._id!.toString()} />
                  <button type="submit" className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white">
                    Approve
                  </button>
                </form>
                <form action={rejectReferralCommission}>
                  <input type="hidden" name="commissionId" value={commission._id!.toString()} />
                  <button type="submit" className="h-9 rounded-full border border-line px-4 text-sm font-medium">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-medium">Pending withdrawals</h2>
      {pendingWithdrawals.length === 0 && (
        <p className="mt-2 text-sm text-foreground/50">Nothing pending.</p>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {pendingWithdrawals.map((request) => {
          const user = userById.get(request.userId.toString());
          return (
            <div key={request._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="text-sm">
                <strong>{user?.name ?? "Unknown"}</strong> — {user?.email}
              </p>
              <p className="mt-1 font-mono text-lg">₦{request.amountNGN.toLocaleString()}</p>
              {user?.bankDetails && (
                <p className="mt-1 text-xs text-foreground/60">
                  {user.bankDetails.accountName} · {user.bankDetails.accountNumber} ·{" "}
                  {user.bankDetails.bankName}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <form action={markWithdrawalPaid}>
                  <input type="hidden" name="requestId" value={request._id!.toString()} />
                  <button type="submit" className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white">
                    Mark paid
                  </button>
                </form>
                <form action={rejectWithdrawal}>
                  <input type="hidden" name="requestId" value={request._id!.toString()} />
                  <button type="submit" className="h-9 rounded-full border border-line px-4 text-sm font-medium">
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
