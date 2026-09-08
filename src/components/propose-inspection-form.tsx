"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ProposeInspectionForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/listings/${listingId}/propose-inspection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: formData.get("scheduledFor") }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not propose a new inspection date");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        name="scheduledFor"
        type="datetime-local"
        required
        className="h-9 rounded-md border border-line px-3 text-sm bg-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Propose new inspection date"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
