"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { TermsScrollAccept } from "@/components/terms-scroll-accept";
import { PasswordInput } from "@/components/password-input";
import { INTENTS, type Intent } from "@/lib/intents";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { PasswordStrength } from "@/components/password-strength";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";
import { HEARD_ABOUT_OPTIONS } from "@/lib/acquisition";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  // "List your property" in the nav links here with ?role=landlord — pre-check "renting
  // out" instead of the old tenant/landlord tab default.
  const [intents, setIntents] = useState<Intent[]>(
    searchParams.get("role") === "landlord" ? ["renting_out"] : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Lightweight, no-dependency spam resistance: `mountedAt` catches bots that submit
  // implausibly fast; `website` is a honeypot — hidden from real users via CSS, but a
  // naive bot filling every field will fill it too. Neither needs a third-party API key.
  const [mountedAt] = useState(() => Date.now());
  // Pre-filled from an invite link (?ref=CODE), but people can also type a code a friend told them.
  const [referralCode, setReferralCode] = useState(() => (searchParams.get("ref") ?? "").toUpperCase());
  const [password, setPassword] = useState("");
  // Someone who came in through a referral link obviously heard about us that way.
  const [heardAbout, setHeardAbout] = useState(referralCode ? "referral_code" : "");
  const preferNotToSay = intents.includes("prefer_not_to_say");

  // "Prefer not to say" is exclusive: choosing it clears and locks the other options.
  function toggleIntent(intent: Intent) {
    setIntents((current) => {
      if (intent === "prefer_not_to_say") return current.includes(intent) ? [] : ["prefer_not_to_say"];
      if (current.includes("prefer_not_to_say")) return current;
      return current.includes(intent) ? current.filter((i) => i !== intent) : [...current, intent];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!isStrongPassword(String(password))) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.pwMismatch"));
      return;
    }
    if (!heardAbout) {
      setError(t("auth.heardRequired"));
      return;
    }
    if (!formData.get("termsAccepted")) {
      setError(t("auth.termsRequired"));
      return;
    }
    if (intents.length === 0) {
      setError(t("auth.intentRequired"));
      return;
    }

    setLoading(true);

    if (formData.get("website")) {
      // Honeypot tripped — pretend to fail generically rather than tipping the bot off.
      setError(t("auth.regFailed"));
      return;
    }

    const payload = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      otherNames: formData.get("otherNames") || undefined,
      email: formData.get("email"),
      phone: formData.get("phone"),
      password,
      confirmPassword,
      intents,
      termsAccepted: "true",
      newsletterOptIn: formData.get("newsletterOptIn") ? "true" : "false",
      formRenderedAt: mountedAt,
      ref: referralCode.trim() || undefined,
      heardAbout,
      heardAboutDetail: (formData.get("heardAboutDetail") as string)?.trim() || undefined,
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.code === "invalid_ref" ? t("auth.refInvalid") : (data?.error ?? t("auth.regFailed")));
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      router.push("/login");
      return;
    }

    // Hard navigation, not router.push — see the identical comment on the login page.
    // A client-side transition here can reach the proxy's auth check before the
    // just-set session cookie is visible to it, bouncing back to /login.
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("auth.getStarted")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("auth.createAccount")}</h1>

      <div className="mt-8">
        <p className="text-sm font-medium">{t("auth.intentQuestion")}</p>
        <p className="mt-1 text-xs text-foreground/60">
          {t("auth.intentHint")}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {INTENTS.map((intent) => {
            const locked = preferNotToSay && intent.value !== "prefer_not_to_say";
            return (
              <label
                key={intent.value}
                className={`flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-clay has-[:checked]:bg-clay/5 ${
                  locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={intents.includes(intent.value)}
                  disabled={locked}
                  onChange={() => toggleIntent(intent.value)}
                />
                {t(`intent.${intent.value}` as MessageKey)}
              </label>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute h-0 w-0 opacity-0"
          style={{ left: "-9999px" }}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="firstName"
            type="text"
            placeholder={t("auth.firstName")}
            required
            className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
          />
          <input
            name="lastName"
            type="text"
            placeholder={t("auth.lastName")}
            required
            className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
          />
        </div>
        <input
          name="otherNames"
          type="text"
          placeholder={t("auth.otherNames")}
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <input
          name="email"
          type="email"
          placeholder={t("auth.email")}
          required
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <input
          name="phone"
          type="tel"
          placeholder={t("auth.phone")}
          required
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <p className="-mt-2 text-xs text-foreground/50">
          {t("auth.contactHint")}
        </p>
        <PasswordInput
          name="password"
          placeholder={t("auth.password")}
          minLength={8}
          required
          autoComplete="new-password"
          onValueChange={setPassword}
        />
        <PasswordStrength password={password} />
        <PasswordInput name="confirmPassword" placeholder={t("auth.confirmPassword")} minLength={8} required autoComplete="new-password" />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("auth.heardQuestion")}</span>
          <select
            value={heardAbout}
            onChange={(event) => setHeardAbout(event.target.value)}
            required
            className="rounded-lg border border-line bg-transparent px-3 py-2.5 focus:border-clay focus:outline-none"
          >
            <option value="" disabled>
              {t("common.chooseOne")}
            </option>
            {HEARD_ABOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`heard.${option.value}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        {(heardAbout === "other" || heardAbout === "event" || heardAbout === "flyer" || heardAbout === "radio_tv") && (
          <input
            name="heardAboutDetail"
            maxLength={120}
            placeholder={heardAbout === "other" ? t("auth.heardOther") : t("auth.heardWhich")}
            required={heardAbout === "other"}
            className="-mt-2 rounded-lg border border-line bg-transparent px-3 py-2.5 focus:border-clay focus:outline-none"
          />
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {t("auth.refLabel")} <span className="font-normal text-foreground/50">{t("auth.optional")}</span>
          </span>
          <input
            name="referralCode"
            value={referralCode}
            onChange={(event) => {
              const code = event.target.value.toUpperCase().replace(/\s/g, "");
              setReferralCode(code);
              if (code && !heardAbout) setHeardAbout("referral_code");
            }}
            maxLength={24}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder={t("auth.refPlaceholder")}
            className="rounded-lg border border-line bg-transparent px-3 py-2.5 font-mono tracking-wide focus:border-clay focus:outline-none"
          />
          <span className="text-xs text-foreground/50">{t("auth.refHint")}</span>
        </label>

        <TermsScrollAccept />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="newsletterOptIn" defaultChecked className="mt-0.5" />
          <span>{t("auth.newsletter")}</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("auth.creating") : t("auth.createAccountButton")}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground/60">
        {t("auth.haveAccount")}{" "}
        <a href="/login" className="text-clay hover:underline">
          {t("nav.login")}
        </a>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
