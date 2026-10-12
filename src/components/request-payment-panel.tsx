"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

type ExistingRequest = { id: string; status: string; paid: boolean; requestedAt: string };

// Landlord side, on an accepted applicant: once you've met and agreed, ask them to pay.
// Creates the agreement (signed by you) and notifies the applicant, who signs and pays.
export function RequestPaymentPanel({
  ticketId,
  applicantName,
  isSale,
  minimumMonths,
  totalNGN,
  lastMetAt,
  existing,
  available,
}: {
  ticketId: string;
  applicantName: string;
  isSale: boolean;
  minimumMonths: number;
  totalNGN: number;
  lastMetAt: string | null;
  existing: ExistingRequest | null;
  available: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaseStart, setLeaseStart] = useState(today);
  const [months, setMonths] = useState(Math.max(12, minimumMonths));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = existing && !existing.paid && existing.status !== "superseded" && existing.status !== "cancelled";
  const termOptions = [...new Set([minimumMonths, 12, 24, 36].filter((m) => m >= minimumMonths))].sort((a, b) => a - b);

  async function call(url: string, body?: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? t("payReq.failed"));
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-2xl border border-clay/30 bg-clay/[0.04] p-5">
      <h2 className="text-sm font-semibold">{t("payReq.title")}</h2>
      <p className="mt-1 text-xs text-foreground/60">
        {lastMetAt ? t("payReq.metOn", { date: lastMetAt }) : t("payReq.notMetYet")}
      </p>

      {existing?.paid ? (
        <p className="mt-3 text-sm font-medium text-verified">
          {t("payReq.paid", { name: applicantName })}{" "}
          <Link href={`/agreements/${existing.id}`} className="underline">
            {t("payReq.viewAgreement")}
          </Link>
        </p>
      ) : !available ? (
        <p className="mt-3 text-sm text-foreground/60">{t("payReq.unavailable")}</p>
      ) : open ? (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <p>{t("payReq.waiting", { name: applicantName, date: existing.requestedAt })}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/agreements/${existing.id}`}
              className="flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-clay hover:text-clay"
            >
              {t("payReq.viewAgreement")}
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm(t("payReq.withdrawConfirm")) && call(`/api/payment-requests/${existing.id}/withdraw`)}
              className="h-9 rounded-full px-3 text-sm text-foreground/60 underline hover:text-red-600 disabled:opacity-50"
            >
              {t("payReq.withdraw")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-foreground/70">{t(isSale ? "payReq.introSale" : "payReq.intro", { name: applicantName })}</p>
          {!isSale && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                {t("payReq.leaseStart")}
                <input
                  type="date"
                  value={leaseStart}
                  min={today}
                  onChange={(e) => setLeaseStart(e.target.value)}
                  className="h-10 rounded-lg border border-line bg-transparent px-3 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                {t("payReq.term")}
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="h-10 rounded-lg border border-line bg-transparent px-3 text-sm text-foreground"
                >
                  {termOptions.map((m) => (
                    <option key={m} value={m}>
                      {t(m === 1 ? "form.monthOne" : "form.months", { count: m })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <p className="text-xs text-foreground/50">{t("payReq.totalNote", { total: `₦${totalNGN.toLocaleString()}` })}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => call("/api/payment-requests", { ticketId, leaseStart, leaseTermMonths: months })}
            className="h-10 self-start rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? t("common.sending") : t("payReq.button", { name: applicantName })}
          </button>
          <p className="text-[11px] text-foreground/50">{t("payReq.multipleNote")}</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
