"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";

// Opened from the "Reset your password" email (?token=…): choose a new password.
function ResetPasswordForm() {
  const { t } = useI18n();
  const token = useSearchParams().get("token") ?? "";
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => !cancelled && setValid(Boolean(data?.valid)))
      .catch(() => !cancelled && setValid(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const confirmPassword = new FormData(event.currentTarget).get("confirmPassword");
    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      if (data?.code === "expired") setValid(false);
      else setError(data?.error ?? t("auth.resetFailed"));
      return;
    }
    setDone(true);
  }

  if (valid === null) return <p className="mt-6 text-sm text-foreground/60">{t("common.pleaseWait")}</p>;

  if (done) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-xl bg-verified/10 p-4 text-sm">
          <p className="font-medium text-verified">{t("auth.resetDoneTitle")}</p>
          <p className="mt-1 text-foreground/70">{t("auth.resetDoneBody")}</p>
        </div>
        <Link href="/login" className="flex h-11 items-center justify-center rounded-full bg-clay font-medium text-white hover:opacity-90">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-sm text-foreground/70">{t("auth.resetExpired")}</p>
        <Link href="/forgot-password" className="flex h-11 items-center justify-center rounded-full bg-clay font-medium text-white hover:opacity-90">
          {t("auth.forgotButton")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <p className="text-sm text-foreground/70">{t("auth.resetIntro")}</p>
      <PasswordInput name="password" placeholder={t("settings.newPassword")} required autoComplete="new-password" onValueChange={setPassword} />
      <PasswordStrength password={password} />
      <PasswordInput name="confirmPassword" placeholder={t("settings.confirmNewPassword")} required autoComplete="new-password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? t("common.saving") : t("auth.resetButton")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
