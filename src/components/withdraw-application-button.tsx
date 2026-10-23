"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

// "Changed your mind?" — withdraw an application (see /api/applications/[id]/withdraw).
export function WithdrawApplicationButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    if (!window.confirm(t("withdraw.confirm"))) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/applications/${ticketId}/withdraw`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? t("withdraw.failed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={withdraw}
        disabled={busy}
        className="text-sm text-foreground/60 underline hover:text-red-600 disabled:opacity-50"
      >
        {busy ? t("common.pleaseWait") : t("withdraw.button")}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
