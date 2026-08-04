"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role,
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

    router.push("/dashboard");
    router.refresh();
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
        <input
          name="name"
          type="text"
          placeholder="Full name"
          required
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
          name="password"
          type="password"
          placeholder="Password"
          minLength={8}
          required
          className="rounded-lg border border-line px-3 py-2.5 focus:border-clay focus:outline-none"
        />
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
