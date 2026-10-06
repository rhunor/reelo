"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";

export function NewTicketForm({ redirectBasePath }: { redirectBasePath: string }) {
  const router = useRouter();
  const { t } = useI18n();
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
      setError(data?.error ?? t("contact.sendFailed"));
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
        placeholder={t("tickets.subject")}
        required
        className="rounded-md border border-line px-3 py-2 bg-transparent"
      />
      <textarea
        name="message"
        placeholder={t("tickets.whatHelp")}
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
        {loading ? t("common.sending") : t("tickets.sendToReallow")}
      </button>
    </form>
  );
}
