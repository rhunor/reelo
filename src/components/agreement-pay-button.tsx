"use client";

import { useState } from "react";

export function AgreementPayButton({ agreementId, amountNGN }: { agreementId: string; amountNGN: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/agreements/${agreementId}/pay-checkout`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not start checkout");
      setLoading(false);
      return;
    }

    const { authorizationUrl } = await res.json();
    window.location.href = authorizationUrl;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Redirecting…" : `Pay ₦${amountNGN.toLocaleString()} rent & deposit via Reallow`}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
