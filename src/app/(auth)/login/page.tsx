"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { PasswordInput } from "@/components/password-input";
import { useI18n } from "@/components/i18n-provider";

// When the proxy bounces a logged-out visitor (e.g. from an email link) to /login, it adds
// ?callbackUrl=. Only honour it for this same site, so the login page can't be used to
// redirect someone off to an arbitrary external URL.
function safeCallbackPath(): string | null {
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError(
        result.code === "account_blocked"
          ? t("auth.blocked")
          : t("auth.invalid"),
      );
      return;
    }

    // A hard navigation here, not router.push — the session cookie next-auth just set needs
    // to be present on the very next request to /dashboard for the proxy's auth check to see
    // it. router.push sends that request as a client-side transition that can race the cookie
    // (a documented next-auth + App Router gap), bouncing back to /login until a manual
    // reload. window.location.href forces a real top-level request, cookie included.
    window.location.href = safeCallbackPath() ?? "/dashboard";
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("dash.welcome")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("nav.login")}</h1>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder={t("auth.email")}
          required
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <PasswordInput name="password" placeholder={t("auth.password")} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("auth.loggingIn") : t("nav.login")}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground/60">
        {t("auth.newHere")}{" "}
        <a href="/register" className="text-clay hover:underline">
          {t("auth.createAccount")}
        </a>
      </p>
    </div>
  );
}
