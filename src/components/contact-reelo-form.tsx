"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function ContactReeloForm({ listingId, subject }: { listingId: string; subject: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, listingId, message: formData.get("message") }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not send message");
      return;
    }

    const { id } = await res.json();
    setTicketId(id);
  }

  if (ticketId) {
    return (
      <p className="mt-4 text-sm text-green-600">
        Sent — Reelo will get back to you.{" "}
        <Link href={`/dashboard/tenant/tickets/${ticketId}`} className="underline">
          View message
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <textarea
        name="message"
        required
        rows={3}
        placeholder="What would you like to ask about this property?"
        className="rounded-md border border-line px-3 py-2 text-sm bg-transparent"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-9 self-start rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Sending…" : "Contact Reelo about this property"}
      </button>
    </form>
  );
}
