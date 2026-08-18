"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function VerifyNinForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const res = await fetch("/api/kyc/verify-nin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nin: formData.get("nin") }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.success) {
      setError(data?.message ?? data?.error ?? "We couldn't verify that NIN. Double-check the number and try again.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        National Identification Number (NIN)
        <input
          name="nin"
          inputMode="numeric"
          pattern="[0-9]{11}"
          maxLength={11}
          minLength={11}
          required
          placeholder="11-digit NIN"
          className="rounded-lg border border-line px-3 py-2.5 font-mono bg-transparent"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 self-start rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify identity"}
      </button>
    </form>
  );
}
