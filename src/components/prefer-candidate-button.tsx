"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";

export function PreferCandidateButton({
  ticketId,
  decision,
}: {
  ticketId: string;
  decision?: "approved" | "declined";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(next: "approved" | "declined") {
    setLoading(next);
    setError(null);

    const res = await fetch(`/api/tickets/${ticketId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: next }),
    });

    setLoading(null);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("decision.failed"));
      return;
    }

    router.refresh();
  }

  if (decision === "approved") {
    return <p className="text-sm font-medium text-verified">{t("decision.accepted")}</p>;
  }
  if (decision === "declined") {
    return <p className="text-sm font-medium text-foreground/50">{t("decision.declined")}</p>;
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={loading !== null}
          className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading === "approved" ? t("common.saving") : t("decision.accept")}
        </button>
        <button
          onClick={() => decide("declined")}
          disabled={loading !== null}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-50"
        >
          {loading === "declined" ? t("common.saving") : t("meetings.decline")}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
