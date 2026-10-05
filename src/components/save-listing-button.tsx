"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SaveListingButton({
  listingId,
  initiallySaved,
  signedIn,
  className = "",
}: {
  listingId: string;
  initiallySaved: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    setLoading(true);
    setSaved((value) => !value); // optimistic
    const res = await fetch(`/api/listings/${listingId}/save`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setSaved((value) => !value);
      return;
    }
    setSaved(Boolean(data?.saved));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={saved}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors ${
        saved ? "border-clay bg-clay/10 text-clay" : "border-line hover:border-clay hover:text-clay"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinejoin="round" d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
      </svg>
      {saved ? "Saved for later" : "Save for later"}
    </button>
  );
}
