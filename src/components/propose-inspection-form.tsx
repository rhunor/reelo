"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";

// Resubmits a rejected listing for verification. No date to pick — same as a new listing,
// a Reallow agent calls to arrange the visit and then schedules it.
export function ProposeInspectionForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resubmit() {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/listings/${listingId}/propose-inspection`, { method: "POST" });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("resubmit.failed"));
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={resubmit}
        disabled={loading}
        className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? t("resubmit.loading") : t("resubmit.button")}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
