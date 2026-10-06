"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setLoading(true);

    const formData = new FormData(form);
    const res = await fetch(`/api/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: formData.get("body") }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("tickets.replyFailed"));
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <textarea
        name="body"
        required
        rows={3}
        placeholder={t("tickets.writeReply")}
        className="rounded-md border border-line px-3 py-2 text-sm bg-transparent"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-9 self-start rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? t("common.sending") : t("common.send")}
      </button>
    </form>
  );
}
