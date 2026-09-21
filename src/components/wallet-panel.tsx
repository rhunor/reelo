"use client";

import { useState } from "react";
import type { ReferralCommission, WithdrawalRequest } from "@/types/models";

const WITHDRAWAL_MINIMUM_NGN = 3000;

// Deliberately never states a percentage anywhere in this component — the commission
// rate is a server-side-only constant (see src/lib/referrals.ts). Copy only ever says
// "a percentage of sales."
export function WalletPanel({
  referralCode,
  walletBalanceNGN,
  commissions,
  withdrawals,
}: {
  referralCode: string;
  walletBalanceNGN: number;
  commissions: ReferralCommission[];
  withdrawals: WithdrawalRequest[];
}) {
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const referralLink =
    typeof window !== "undefined" ? `${window.location.origin}/register?ref=${referralCode}` : "";

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function requestWithdrawal() {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNGN: Number(amount) }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not submit withdrawal request");
      return;
    }

    setSent(true);
    setAmount("");
  }

  return (
    <div className="mt-8 rounded-lg border border-line p-4">
      <p className="font-medium">Your Reallow wallet</p>
      <p className="mt-1 text-xs text-foreground/60">
        You earn a percentage of sales completed using your referral code — share it with
        anyone. Earnings sit here until you withdraw them to your bank account.
      </p>

      <p className="mt-4 font-mono text-2xl font-medium">₦{walletBalanceNGN.toLocaleString()}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="rounded-md border border-line bg-transparent px-3 py-2 text-sm">
          {referralLink || referralCode}
        </code>
        <button
          type="button"
          onClick={copyLink}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-sm font-medium">Request a withdrawal</p>
        <p className="mt-1 text-xs text-foreground/50">
          Minimum ₦{WITHDRAWAL_MINIMUM_NGN.toLocaleString()}, paid to the bank account on your
          profile.
        </p>
        {sent ? (
          <p className="mt-2 text-sm text-verified">Request sent — Reallow will process it shortly.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={WITHDRAWAL_MINIMUM_NGN}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount (₦)"
              className="h-9 w-40 rounded-md border border-line bg-transparent px-3 text-sm"
            />
            <button
              type="button"
              disabled={loading || !amount}
              onClick={requestWithdrawal}
              className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Sending…" : "Request withdrawal"}
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {(commissions.length > 0 || withdrawals.length > 0) && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-sm font-medium">History</p>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            {commissions.map((c) => (
              <div key={c._id!.toString()} className="flex items-center justify-between">
                <span className="text-foreground/70">
                  Referral commission ·{" "}
                  {c.status === "pending" ? "awaiting approval" : c.status}
                </span>
                <span className="font-mono">₦{c.amountNGN.toLocaleString()}</span>
              </div>
            ))}
            {withdrawals.map((w) => (
              <div key={w._id!.toString()} className="flex items-center justify-between">
                <span className="text-foreground/70">Withdrawal · {w.status}</span>
                <span className="font-mono">−₦{w.amountNGN.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
