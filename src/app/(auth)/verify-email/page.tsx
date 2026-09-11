"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error ?? "Could not verify your email");
          return;
        }
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong — try again.");
      });
  }, [token]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      {status === "pending" && <p className="text-sm text-foreground/70">Verifying your email…</p>}
      {status === "success" && (
        <>
          <h1 className="text-2xl font-semibold">Email verified</h1>
          <p className="mt-2 text-sm text-foreground/70">You&apos;re all set.</p>
          {/* A plain <a>, not next/link — /dashboard is only ever a redirect() to a
              role-specific page, and a client-side <Link> transition into a redirecting
              Server Component hits a Next.js App Router bug (see the comment in
              site-header.tsx). A hard navigation here is a fine trade for a page this
              rarely hit. */}
          <a
            href="/dashboard"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90"
          >
            Go to dashboard
          </a>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-semibold">Couldn&apos;t verify your email</h1>
          <p className="mt-2 text-sm text-red-600">{message}</p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
          <p className="text-sm text-foreground/70">Loading…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
