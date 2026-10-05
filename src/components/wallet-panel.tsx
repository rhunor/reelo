"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatLagos } from "@/lib/time";
import type { WalletEarning, WalletWithdrawal } from "@/lib/dashboard-data";

const WITHDRAWAL_MINIMUM_NGN = 3000;
const FUNDING_MINIMUM_NGN = 500;

const EARNING_STATUS: Record<WalletEarning["status"], string> = {
  pending: "Awaiting approval",
  approved: "Credited",
  rejected: "Not approved",
};

// Deliberately never states a commission percentage — the rate is a server-side-only
// constant (see src/lib/referrals.ts). Copy only ever says "a percentage of sales."
export function WalletPanel({
  walletBalanceNGN,
  referralCode,
  earnings,
  withdrawals,
  hasBankDetails,
}: {
  walletBalanceNGN: number;
  referralCode?: string;
  earnings: WalletEarning[];
  withdrawals: WalletWithdrawal[];
  hasBankDetails: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"fund" | "withdraw">("fund");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const totalEarned = earnings.filter((e) => e.status === "approved").reduce((s, e) => s + e.amountNGN, 0);
  const pendingEarnings = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + e.amountNGN, 0);

  async function submit() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch(tab === "fund" ? "/api/wallet/fund" : "/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNGN: Number(amount) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? "Something went wrong");
      return;
    }
    if (data?.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setLoading(false);
    setAmount("");
    setMessage("Withdrawal requested — Reallow will pay it into your bank account shortly.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-gradient-to-br from-clay to-clay/80 p-5 text-white">
        <p className="text-xs font-medium tracking-wide uppercase opacity-80">Reallow wallet balance</p>
        <p className="mt-1 font-mono text-3xl font-semibold">₦{walletBalanceNGN.toLocaleString()}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-90">
          <span>Referral earnings: ₦{totalEarned.toLocaleString()}</span>
          {pendingEarnings > 0 && <span>Awaiting approval: ₦{pendingEarnings.toLocaleString()}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <div className="flex gap-1 rounded-full bg-foreground/5 p-1">
          {(["fund", "withdraw"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setTab(option);
                setError(null);
                setMessage(null);
              }}
              className={`h-8 flex-1 rounded-full text-sm font-medium ${
                tab === option ? "bg-background shadow-sm" : "text-foreground/60"
              }`}
            >
              {option === "fund" ? "Fund wallet" : "Withdraw"}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-foreground/60">
          {tab === "fund"
            ? `Top up by card (minimum ₦${FUNDING_MINIMUM_NGN.toLocaleString()}). Use your balance for inspection fees and other payments on Reallow — we'll always ask before paying from it.`
            : `Minimum ₦${WITHDRAWAL_MINIMUM_NGN.toLocaleString()}, paid to the bank account in your settings.`}
        </p>
        {tab === "withdraw" && !hasBankDetails && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            Add your bank details in{" "}
            <a href="/dashboard/settings#profile" className="underline">
              Settings
            </a>{" "}
            before withdrawing.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-foreground/50">₦</span>
            <input
              type="number"
              inputMode="numeric"
              min={tab === "fund" ? FUNDING_MINIMUM_NGN : WITHDRAWAL_MINIMUM_NGN}
              max={tab === "withdraw" ? walletBalanceNGN : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="h-10 w-full min-w-32 rounded-md border border-line bg-transparent pr-3 pl-7 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={loading || !amount}
            onClick={submit}
            className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Please wait…" : tab === "fund" ? "Fund with card" : "Request withdrawal"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-verified">{message}</p>}
      </div>

      <div>
        <p className="text-sm font-semibold">Reallow earnings</p>
        <p className="mt-0.5 text-xs text-foreground/60">
          You earn a percentage of sales completed using your referral code
          {referralCode ? (
            <>
              {" "}
              (<span className="font-mono">{referralCode}</span>)
            </>
          ) : null}
          . Earnings are credited to your wallet once Reallow approves them.
        </p>
        {earnings.length === 0 ? (
          <p className="mt-3 rounded-xl bg-foreground/5 p-4 text-center text-sm text-foreground/50">
            No earnings yet — share your referral code to start earning.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-line rounded-xl border border-line">
            {earnings.map((earning) => (
              <li key={earning.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="block">Referral earnings</span>
                  <span className="block text-[11px] text-foreground/50">
                    {formatLagos(earning.at)} · {EARNING_STATUS[earning.status]}
                  </span>
                </span>
                <span className={`font-mono ${earning.status === "approved" ? "text-verified" : "text-foreground/50"}`}>
                  +₦{earning.amountNGN.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {withdrawals.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Withdrawals</p>
          <ul className="mt-2 flex flex-col divide-y divide-line rounded-xl border border-line">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="block">To your bank</span>
                  <span className="block text-[11px] text-foreground/50">
                    {formatLagos(w.at)} · {w.status === "paid" ? "Paid" : w.status === "rejected" ? "Rejected" : "Processing"}
                  </span>
                </span>
                <span className="font-mono">−₦{w.amountNGN.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
