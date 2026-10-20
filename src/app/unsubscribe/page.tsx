"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Linked from the bottom of Reallow newsletter emails. A button (not an automatic action on
// page load), so email security scanners that open links can't unsubscribe anyone.
function Unsubscribe() {
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ u: params.get("u"), t: params.get("t") }),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p className="mt-4 text-foreground/70">
        You&apos;ve been unsubscribed from Reallow news and updates. You&apos;ll still get emails about your own account —
        sign-in codes, meetings, applications and payments.
      </p>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-foreground/70">
        Stop receiving Reallow news, offers and updates by email? Emails about your own account (sign-in codes, meetings,
        applications and payments) will still come through.
      </p>
      {state === "error" && <p className="text-sm text-red-600">This unsubscribe link isn&apos;t valid. Try the link in your latest email.</p>}
      <button
        type="button"
        onClick={confirm}
        disabled={state === "busy"}
        className="h-11 rounded-full bg-clay px-6 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
      </button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Email preferences</h1>
      <Suspense fallback={null}>
        <Unsubscribe />
      </Suspense>
      <Link href="/" className="mt-6 text-sm text-clay hover:underline">
        ← Back to Reallow
      </Link>
    </div>
  );
}
