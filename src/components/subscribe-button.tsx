"use client";

import { useState } from "react";

export function SubscribeButton({ tier }: { tier: "pro" | "pro_plus" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      setError("Could not start checkout");
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
        className="h-10 w-full rounded-full bg-clay text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Subscribe"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
