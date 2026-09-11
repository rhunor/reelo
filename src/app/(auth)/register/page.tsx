"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { TermsScrollAccept } from "@/components/terms-scroll-accept";
import { PasswordInput } from "@/components/password-input";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // "List your property" in the nav links here with ?role=landlord so it opens straight
  // into the landlord tab instead of defaulting to tenant.
  const [role, setRole] = useState<"tenant" | "landlord">(
    searchParams.get("role") === "landlord" ? "landlord" : "tenant",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!formData.get("termsAccepted")) {
      setError("You need to agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    const payload = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      otherNames: formData.get("otherNames") || undefined,
      email: formData.get("email"),
      phone: formData.get("phone"),
      password,
      confirmPassword,
      role,
      termsAccepted: "true",
      newsletterOptIn: formData.get("newsletterOptIn") ? "true" : "false",
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Registration failed");
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
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Get started</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create an account</h1>
      <div className="mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => setRole("tenant")}
          className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            role === "tenant" ? "border-transparent bg-clay text-white" : "border-line hover:border-clay"
          }`}
        >
          I&apos;m a tenant
        </button>
        <button
          type="button"
          onClick={() => setRole("landlord")}
          className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            role === "landlord" ? "border-transparent bg-clay text-white" : "border-line hover:border-clay"
          }`}
        >
          I&apos;m a landlord
        </button>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="firstName"
            type="text"
            placeholder="First name"
            required
            className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
          />
          <input
            name="lastName"
            type="text"
            placeholder="Last name"
            required
            className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
          />
        </div>
        <input
          name="otherNames"
          type="text"
          placeholder="Other names (optional)"
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone number"
          required
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
        <PasswordInput name="password" placeholder="Password" minLength={8} required />
        <PasswordInput name="confirmPassword" placeholder="Confirm password" minLength={8} required />

        <TermsScrollAccept />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="newsletterOptIn" defaultChecked className="mt-0.5" />
          <span>Keep me updated about Reallow by email</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-full bg-clay font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground/60">
        Already have an account?{" "}
        <a href="/login" className="text-clay hover:underline">
          Log in
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
