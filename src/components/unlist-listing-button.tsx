"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

// Owner's dashboard: take a property off the market, or put it back.
export function UnlistListingButton({ listingId, mode }: { listingId: string; mode: "unlist" | "relist" }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (mode === "unlist" && !window.confirm(t("unlist.confirm"))) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/listings/${listingId}/unlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? t("unlist.failed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={
          mode === "unlist"
            ? "h-8 rounded-full border border-line px-3.5 text-xs font-medium hover:border-red-600 hover:text-red-600 disabled:opacity-50"
            : "h-8 rounded-full bg-clay px-3.5 text-xs font-medium text-white disabled:opacity-50"
        }
      >
        {busy ? t("common.pleaseWait") : t(mode === "unlist" ? "unlist.button" : "unlist.relist")}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
