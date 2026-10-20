"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
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

const RESEND_SECONDS = 30;

// Two steps: email + password (checked by /api/auth/login-code, which emails a one-time
// code), then the code — the credentials provider only signs in with both.
export default function LoginPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(): Promise<boolean> {
    const res = await fetch("/api/auth/login-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setSentTo(data?.sentTo ?? email);
      setCooldown(RESEND_SECONDS);
      return true;
    }
    if (data?.code === "wait") {
      // A code was sent moments ago — it's still good to use.
      setSentTo(data.sentTo ?? email);
      setCooldown(data.seconds ?? RESEND_SECONDS);
      return true;
    }
    setError(
      data?.code === "account_blocked"
        ? t("auth.blocked")
        : data?.code === "email_failed"
          ? t("auth.codeEmailFailed")
          : t("auth.invalid"),
    );
    return false;
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await requestCode();
    setLoading(false);
    if (ok) {
      setCode("");
      setStep("code");
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, code: code.trim(), redirect: false });
    if (result?.error) {
      setLoading(false);
      setError(result.code === "account_blocked" ? t("auth.blocked") : t("auth.codeInvalid"));
      return;
    }
    // A hard navigation here, not router.push — the session cookie next-auth just set needs
    // to be present on the very next request to /dashboard for the proxy's auth check to see
    // it. router.push sends that request as a client-side transition that can race the cookie
    // (a documented next-auth + App Router gap), bouncing back to /login until a manual
    // reload. window.location.href forces a real top-level request, cookie included.
    window.location.href = safeCallbackPath() ?? "/dashboard";
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setLoading(true);
    if (await requestCode()) setNotice(t("auth.codeResent"));
    setLoading(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("dash.welcome")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {step === "password" ? t("nav.login") : t("auth.codeTitle")}
      </h1>

      {step === "password" ? (
        <form onSubmit={submitPassword} className="mt-8 flex flex-col gap-4">
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.email")}
            required
            className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
          />
          <div>
            <PasswordInput
              name="password"
              placeholder={t("auth.password")}
              required
              autoComplete="current-password"
              onValueChange={setPassword}
            />
            <Link href="/forgot-password" className="mt-2 inline-block text-sm text-clay hover:underline">
              {t("auth.forgotLink")}
            </Link>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("auth.loggingIn") : t("nav.login")}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-foreground/70">{t("auth.codeSent", { email: sentTo })}</p>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            autoFocus
            required
            className="rounded-lg border border-line px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] focus:border-clay focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-verified">{notice}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("auth.loggingIn") : t("auth.codeVerify")}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("password");
                setError(null);
                setNotice(null);
              }}
              className="text-foreground/60 hover:text-clay"
            >
              ← {t("auth.codeBack")}
            </button>
            <button
              type="button"
              disabled={loading || cooldown > 0}
              onClick={resend}
              className="text-clay hover:underline disabled:text-foreground/40 disabled:no-underline"
            >
              {cooldown > 0 ? t("auth.codeResendIn", { seconds: cooldown }) : t("auth.codeResend")}
            </button>
          </div>
          <p className="text-xs text-foreground/50">{t("auth.codeHint")}</p>
        </form>
      )}

      <p className="mt-6 text-sm text-foreground/60">
        {t("auth.newHere")}{" "}
        <Link href="/register" className="text-clay hover:underline">
          {t("auth.createAccount")}
        </Link>
      </p>
    </div>
  );
}
