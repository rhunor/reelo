"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TenantProfile } from "@/types/models";

const inputClass = "rounded-lg border border-line px-3 py-2 bg-transparent";

export function TenantProfileForm({ profile }: { profile?: TenantProfile }) {
  const router = useRouter();
  const [visible, setVisible] = useState(profile?.visibleToLandlords ?? false);
  const [hasPets, setHasPets] = useState(profile?.hasPets ?? false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      occupation: formData.get("occupation") || undefined,
      employer: formData.get("employer") || undefined,
      monthlyIncomeNGN: formData.get("monthlyIncomeNGN") || undefined,
      householdSize: formData.get("householdSize") || undefined,
      hasPets,
      aboutMe: formData.get("aboutMe") || undefined,
      visibleToLandlords: visible,
    };

    const res = await fetch("/api/tenant-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not save profile");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          name="occupation"
          placeholder="Occupation"
          defaultValue={profile?.occupation}
          className={inputClass}
        />
        <input
          name="employer"
          placeholder="Employer (optional)"
          defaultValue={profile?.employer}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          name="monthlyIncomeNGN"
          type="number"
          min={0}
          placeholder="Monthly income (₦, optional)"
          defaultValue={profile?.monthlyIncomeNGN}
          className={inputClass}
        />
        <input
          name="householdSize"
          type="number"
          min={1}
          placeholder="Household size"
          defaultValue={profile?.householdSize}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input type="checkbox" checked={hasPets} onChange={(event) => setHasPets(event.target.checked)} />
        I have a pet
      </label>
      <textarea
        name="aboutMe"
        placeholder="A short note about yourself (optional)"
        rows={3}
        defaultValue={profile?.aboutMe}
        className={inputClass}
      />

      <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        <span>
          <span className="font-medium">Share this with a landlord via Reallow</span>
          <span className="mt-1 block text-foreground/60">
            Off by default. When you sign a tenancy agreement, the landlord only sees this if
            you&apos;ve turned it on — otherwise they see nothing about you beyond what&apos;s on
            the agreement itself.
          </span>
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-verified">Saved.</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 self-start rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
