"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

type Bank = { name: string; code: string };

// The bank account a property owner's share of every payment settles to. Paystack checks
// the account number and returns the account holder's name; it must match the owner's
// verified name, and is then set up as their Paystack subaccount (see lib/payout-account.ts).
export function PayoutAccountForm({
  current,
  verified,
}: {
  current?: { bankName: string; accountNumber: string; accountName: string };
  verified: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [editing, setEditing] = useState(!current);
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editing || banks) return;
    let cancelled = false;
    fetch("/api/payout-account/banks")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.banks) setBanks(data.banks);
        else setError(data?.error ?? t("common.somethingWrong"));
      })
      .catch(() => !cancelled && setError(t("common.somethingWrong")));
    return () => {
      cancelled = true;
    };
  }, [editing, banks, t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setLoading(true);
    const res = await fetch("/api/payout-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, accountNumber }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? t("common.somethingWrong"));
      return;
    }
    setSaved(t("payout.saved", { name: data.accountName, bank: data.bankName }));
    setEditing(false);
    router.refresh();
  }

  if (!verified) return <p className="text-sm text-foreground/70">{t("payout.verifyFirst")}</p>;

  if (!editing && current) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <div className="rounded-xl border border-verified/40 bg-verified/5 p-4">
          <p className="font-medium">{current.accountName}</p>
          <p className="text-foreground/70">
            {current.bankName} · {current.accountNumber}
          </p>
        </div>
        {saved && <p className="text-verified">{saved}</p>}
        <button type="button" onClick={() => setEditing(true)} className="self-start text-clay hover:underline">
          {t("payout.change")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <select
        value={bankCode}
        onChange={(event) => setBankCode(event.target.value)}
        required
        disabled={!banks}
        aria-label={t("profile.bankName")}
        className="h-11 rounded-lg border border-line bg-transparent px-3 text-sm"
      >
        <option value="">{banks ? t("payout.chooseBank") : t("payout.loadingBanks")}</option>
        {banks?.map((bank) => (
          <option key={bank.code} value={bank.code}>
            {bank.name}
          </option>
        ))}
      </select>
      <input
        value={accountNumber}
        onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
        inputMode="numeric"
        autoComplete="off"
        required
        placeholder={t("profile.accountNumber")}
        className="h-11 rounded-lg border border-line bg-transparent px-3 font-mono text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !bankCode || accountNumber.length !== 10}
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.pleaseWait") : t("payout.save")}
        </button>
        {current && (
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-foreground/60 hover:text-clay">
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
