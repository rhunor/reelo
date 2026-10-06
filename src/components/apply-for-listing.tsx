"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";

export function ApplyForListingButton({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/listings/${listingId}/apply`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? t("apply.failed"));
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="mt-4 rounded-xl border border-clay/40 bg-clay/5 p-4">
        <p className="text-sm font-medium">{t("apply.question")}</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground/60">
          {t("apply.explainer")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={apply}
            className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? t("apply.applying") : t("apply.confirm")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirming(false)}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium"
          >
            {t("common.cancel")}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="mt-4 h-11 w-full rounded-full bg-clay text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      {t("apply.button")}
    </button>
  );
}
