"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplyForListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/listings/${listingId}/apply`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't send your application");
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="mt-4 rounded-xl border border-clay/40 bg-clay/5 p-4">
        <p className="text-sm font-medium">Apply for this property?</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground/60">
          The landlord will see your verification status and only the profile details you&apos;ve made visible
          in Settings. Your phone number and email are never shared, and you can&apos;t message each other —
          Reallow arranges everything.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={apply}
            className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Applying…" : "Yes, apply"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirming(false)}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="mt-4 h-11 w-full rounded-full bg-clay text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      Apply for this property
    </button>
  );
}
