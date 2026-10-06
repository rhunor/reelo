"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export function TerminateAgreementButton({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm(t("agreement.end.confirm"))) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/agreements/${agreementId}/terminate`, { method: "POST" });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("agreement.end.failed"));
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-50"
      >
        {loading ? t("common.saving") : t("agreement.end.button")}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
