"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function NewTicketForm({ redirectBasePath }: { redirectBasePath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: formData.get("subject"),
        message: formData.get("message"),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not send message");
      setLoading(false);
      return;
    }

    const { id } = await res.json();
    router.push(`${redirectBasePath}/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <input
        name="subject"
        placeholder="Subject"
        required
        className="rounded-md border border-line px-3 py-2 bg-transparent"
      />
      <textarea
        name="message"
        placeholder="What can we help with?"
        required
        rows={5}
        className="rounded-md border border-line px-3 py-2 bg-transparent"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay text-white disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send to Reallow"}
      </button>
    </form>
  );
}
