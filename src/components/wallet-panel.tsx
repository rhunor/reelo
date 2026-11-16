"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { formatLagos } from "@/lib/time";
import type { WalletEarning, WalletWithdrawal } from "@/lib/dashboard-data";
import { withdrawableNGN } from "@/lib/withdrawable";

const WITHDRAWAL_MINIMUM_NGN = 3000;

const EARNING_STATUS: Record<WalletEarning["status"], MessageKey> = {
  pending: "wallet.earning.pending",
  approved: "wallet.earning.approved",
  rejected: "wallet.earning.rejected",
};

// The wallet holds referral earnings (Reallow's own money, credited once approved) and any
// balance left from before top-ups were switched off. Nobody can add money to it — Reallow
// doesn't hold customer money — and only approved referral earnings can be withdrawn.
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
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const totalEarned = earnings.filter((e) => e.status === "approved").reduce((s, e) => s + e.amountNGN, 0);
  const pendingEarnings = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + e.amountNGN, 0);
  // Only approved referral earnings can be withdrawn — the rest is for payments on Reallow.
  const withdrawable = withdrawableNGN({
    walletBalanceNGN,
    approvedEarningsNGN: totalEarned,
    withdrawnOrPendingNGN: withdrawals.filter((w) => w.status !== "rejected").reduce((s, w) => s + w.amountNGN, 0),
  });

  async function submit() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNGN: Number(amount) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? t("common.somethingWrong"));
      return;
    }
    setLoading(false);
    setAmount("");
    setMessage(t("wallet.withdrawRequested"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-gradient-to-br from-clay to-clay/80 p-5 text-white">
        <p className="text-xs font-medium tracking-wide uppercase opacity-80">{t("wallet.balance")}</p>
        <p className="mt-1 font-mono text-3xl font-semibold">₦{walletBalanceNGN.toLocaleString()}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-90">
          <span>{t("wallet.referralEarnings", { amount: `₦${totalEarned.toLocaleString()}` })}</span>
          {pendingEarnings > 0 && <span>{t("wallet.awaitingApproval", { amount: `₦${pendingEarnings.toLocaleString()}` })}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <p className="text-sm font-semibold">{t("wallet.withdrawTab")}</p>
        <p className="mt-1 text-xs text-foreground/60">
          {t("wallet.withdrawHint", { min: `₦${WITHDRAWAL_MINIMUM_NGN.toLocaleString()}` })}
        </p>
        <p className="mt-2 text-sm">
          {t("wallet.withdrawable", { amount: `₦${withdrawable.toLocaleString()}` })}
          <span className="mt-0.5 block text-xs text-foreground/60">{t("wallet.withdrawableNote")}</span>
        </p>
        {!hasBankDetails && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {t("wallet.addBankBefore")}{" "}
            <a href="/dashboard/settings#payout" className="underline">
              {t("menu.settings")}
            </a>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-foreground/50">₦</span>
            <input
              type="number"
              inputMode="numeric"
              min={WITHDRAWAL_MINIMUM_NGN}
              max={withdrawable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("wallet.amount")}
              className="h-10 w-full min-w-32 rounded-md border border-line bg-transparent pr-3 pl-7 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={loading || !amount || withdrawable < WITHDRAWAL_MINIMUM_NGN}
            onClick={submit}
            className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? t("common.pleaseWait") : t("wallet.requestWithdrawal")}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-verified">{message}</p>}
      </div>

      <div>
        <p className="text-sm font-semibold">{t("wallet.earningsTitle")}</p>
        <p className="mt-0.5 text-xs text-foreground/60">
          {t("wallet.earningsExplainer", { code: referralCode ?? "" })}
        </p>
        {earnings.length === 0 ? (
          <p className="mt-3 rounded-xl bg-foreground/5 p-4 text-center text-sm text-foreground/50">
            {t("wallet.noEarnings")}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-line rounded-xl border border-line">
            {earnings.map((earning) => (
              <li key={earning.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="block">{t("wallet.referralEarningsLabel")}</span>
                  <span className="block text-[11px] text-foreground/50">
                    {formatLagos(earning.at)} · {t(EARNING_STATUS[earning.status])}
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
          <p className="text-sm font-semibold">{t("wallet.withdrawals")}</p>
          <ul className="mt-2 flex flex-col divide-y divide-line rounded-xl border border-line">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="block">{t("tx.toBank")}</span>
                  <span className="block text-[11px] text-foreground/50">
                    {formatLagos(w.at)} · {t(w.status === "paid" ? "tx.paid" : w.status === "rejected" ? "tx.rejected" : "tx.processing")}
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
