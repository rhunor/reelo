"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { formatLagos } from "@/lib/time";
import type { WalletEarning, WalletWithdrawal } from "@/lib/dashboard-data";

const WITHDRAWAL_MINIMUM_NGN = 3000;
const FUNDING_MINIMUM_NGN = 500;

const EARNING_STATUS: Record<WalletEarning["status"], MessageKey> = {
  pending: "wallet.earning.pending",
  approved: "wallet.earning.approved",
  rejected: "wallet.earning.rejected",
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
  const { t } = useI18n();
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
      setError(data?.error ?? t("common.somethingWrong"));
      return;
    }
    if (data?.authorizationUrl) {
      window.location.href = data.authorizationUrl;
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
              {t(option === "fund" ? "wallet.fundTab" : "wallet.withdrawTab")}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-foreground/60">
          {tab === "fund"
            ? t("wallet.fundHint", { min: `₦${FUNDING_MINIMUM_NGN.toLocaleString()}` })
            : t("wallet.withdrawHint", { min: `₦${WITHDRAWAL_MINIMUM_NGN.toLocaleString()}` })}
        </p>
        {tab === "withdraw" && !hasBankDetails && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {t("wallet.addBankBefore")}{" "}
            <a href="/dashboard/settings#profile" className="underline">
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
              min={tab === "fund" ? FUNDING_MINIMUM_NGN : WITHDRAWAL_MINIMUM_NGN}
              max={tab === "withdraw" ? walletBalanceNGN : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("wallet.amount")}
              className="h-10 w-full min-w-32 rounded-md border border-line bg-transparent pr-3 pl-7 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={loading || !amount}
            onClick={submit}
            className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? t("common.pleaseWait") : t(tab === "fund" ? "wallet.fundWithCard" : "wallet.requestWithdrawal")}
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
