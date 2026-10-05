"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Every payment that can come out of the Reallow wallet goes through this: if the wallet
// covers the amount, the user is asked first whether to pay from it, with card as the
// alternative. `endpoint` takes { method: "wallet" | "card" } and returns either
// { success } (wallet) or { authorizationUrl } (card → Paystack).
export function PayChoice({
  endpoint,
  amountNGN,
  walletBalanceNGN,
  label,
  onPaid,
}: {
  endpoint: string;
  amountNGN: number;
  walletBalanceNGN: number;
  label?: string;
  onPaid?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"wallet" | "card" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const walletCovers = walletBalanceNGN >= amountNGN;

  async function pay(method: "wallet" | "card") {
    setLoading(method);
    setError(null);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "Payment could not be started");
      setLoading(null);
      return;
    }
    if (data?.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setLoading(null);
    setAsking(false);
    onPaid?.();
    router.refresh();
  }

  const amount = `₦${amountNGN.toLocaleString()}`;

  if (asking && walletCovers) {
    return (
      <div className="rounded-xl border border-clay/40 bg-clay/5 p-4">
        <p className="text-sm font-medium">Pay from your Reallow wallet?</p>
        <p className="mt-1 text-xs text-foreground/60">
          You have ₦{walletBalanceNGN.toLocaleString()} in your wallet. Paying {amount} from it
          leaves ₦{(walletBalanceNGN - amountNGN).toLocaleString()}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => pay("wallet")}
            className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading === "wallet" ? "Paying…" : "Yes, pay from wallet"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => pay("card")}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-50"
          >
            {loading === "card" ? "Redirecting…" : "No, pay with card"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setAsking(false)}
            className="h-9 px-2 text-sm text-foreground/60"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => (walletCovers ? setAsking(true) : pay("card"))}
        className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Redirecting…" : (label ?? `Pay ${amount}`)}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
