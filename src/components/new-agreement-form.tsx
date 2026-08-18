"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "rounded-md border border-line px-3 py-2 bg-transparent";

export function NewAgreementForm({ listingId: defaultListingId }: { listingId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      listingId: formData.get("listingId"),
      tenantEmail: formData.get("tenantEmail"),
      rentNGN: formData.get("rentNGN"),
      depositNGN: formData.get("depositNGN"),
      leaseStart: formData.get("leaseStart"),
      leaseTermMonths: formData.get("leaseTermMonths"),
      responsibilities: formData.get("responsibilities"),
    };

    const res = await fetch("/api/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not create agreement");
      return;
    }

    const { id } = await res.json();
    router.push(`/agreements/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <input
        name="listingId"
        placeholder="Listing ID"
        defaultValue={defaultListingId}
        required
        className={inputClass}
      />
      <input name="tenantEmail" type="email" placeholder="Tenant email" required className={inputClass} />
      <div className="grid grid-cols-2 gap-4">
        <input name="rentNGN" type="number" min={0} placeholder="Rent (₦/year)" required className={inputClass} />
        <input name="depositNGN" type="number" min={0} placeholder="Deposit (₦)" required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input name="leaseStart" type="date" required className={inputClass} />
        <input
          name="leaseTermMonths"
          type="number"
          min={12}
          defaultValue={12}
          placeholder="Term (months, min. 12)"
          required
          className={inputClass}
        />
      </div>
      <textarea
        name="responsibilities"
        placeholder="Responsibilities (who covers repairs, utilities, etc.)"
        required
        minLength={10}
        rows={4}
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay text-white disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create agreement"}
      </button>
    </form>
  );
}
