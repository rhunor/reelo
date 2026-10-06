"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export function SignAgreementForm({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!agreed) {
      setError(t("agreement.sign.confirmFirst"));
      return;
    }

    setLoading(true);
    const formData = new FormData(event.currentTarget);

    const res = await fetch(`/api/agreements/${agreementId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: formData.get("fullName") }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("agreement.sign.failed"));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-lg border border-line p-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("agreement.sign.typeName")}
        <input
          name="fullName"
          required
          minLength={2}
          className="rounded-md border border-line px-3 py-2 bg-transparent"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        {t("agreement.sign.consent")}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-10 self-start rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? t("agreement.sign.signing") : t("agreement.sign.button")}
      </button>
    </form>
  );
}
