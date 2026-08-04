"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function InspectionBookingForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const res = await fetch("/api/inspections/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, scheduledFor: formData.get("scheduledFor") }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not book inspection");
      return;
    }

    setMessage("Inspection requested — the landlord will confirm a time.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Preferred date
        <input
          name="scheduledFor"
          type="date"
          required
          min={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-line px-3 py-2 bg-transparent"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Booking…" : "Book inspection"}
      </button>
      {message && <p className="text-sm text-green-600 sm:basis-full">{message}</p>}
      {error && <p className="text-sm text-red-600 sm:basis-full">{error}</p>}
    </form>
  );
}
