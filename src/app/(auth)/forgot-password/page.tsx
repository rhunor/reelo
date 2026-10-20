"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

// Ask for a password-reset link. The answer is the same whether or not the email has an
// account (see /api/auth/forgot-password).
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const email = new FormData(event.currentTarget).get("email");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("auth.forgotFailed"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
      {sent ? (
        <div className="mt-6 rounded-xl bg-verified/10 p-4 text-sm">
          <p className="font-medium text-verified">{t("auth.forgotSentTitle")}</p>
          <p className="mt-1 text-foreground/70">{t("auth.forgotSentBody")}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-foreground/70">{t("auth.forgotIntro")}</p>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.email")}
            required
            className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("common.sending") : t("auth.forgotButton")}
          </button>
        </form>
      )}
      <Link href="/login" className="mt-6 text-sm text-clay hover:underline">
        ← {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
