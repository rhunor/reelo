"use client";

import { useState, type FormEvent } from "react";
import { PaymentBreakdown } from "@/components/payment-breakdown";

export function InspectionBookingForm({ ticketId, feeNGN }: { ticketId: string; feeNGN: number }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const res = await fetch(`/api/tickets/${ticketId}/inspection-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: formData.get("scheduledFor") }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not start checkout");
      setLoading(false);
      return;
    }

    const { authorizationUrl } = await res.json();
    window.location.href = authorizationUrl;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Suggest a date &amp; time — the landlord can accept it or suggest another
        <input
          name="scheduledFor"
          type="datetime-local"
          required
          min={new Date().toISOString().slice(0, 16)}
          className="rounded-md border border-line px-3 py-2 bg-transparent"
        />
      </label>

      <PaymentBreakdown
        lines={[{ label: "Inspection fee", amountNGN: feeNGN }]}
        totalNGN={feeNGN}
        note="Covers Reallow's agent travelling to the property for your inspection — priced by location."
      />

      <button
        type="submit"
        disabled={loading}
        className="h-10 self-start rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Redirecting…" : `Pay ₦${feeNGN.toLocaleString()} & book inspection`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
