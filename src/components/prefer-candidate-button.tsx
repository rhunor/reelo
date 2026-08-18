"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PreferCandidateButton({ ticketId, preferred }: { ticketId: string; preferred: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/tickets/${ticketId}/prefer`, { method: "POST" });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not save preference");
      return;
    }

    router.refresh();
  }

  if (preferred) {
    return <p className="text-sm font-medium text-verified">You prefer this tenant</p>;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Prefer this tenant"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
