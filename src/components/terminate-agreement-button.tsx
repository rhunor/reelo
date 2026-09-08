"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TerminateAgreementButton({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Mark this tenancy as ended on your end? This can't be undone.")) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/agreements/${agreementId}/terminate`, { method: "POST" });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not end the tenancy");
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
        {loading ? "Saving…" : "Mark tenancy ended on my end"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
