"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkInAtListing } from "@/app/dashboard/admin/actions";

export function CheckInButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setMessage(null);

    if (!navigator.geolocation) {
      setError("Geolocation isn't available on this device");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const formData = new FormData();
        formData.set("listingId", listingId);
        formData.set("lat", String(position.coords.latitude));
        formData.set("lng", String(position.coords.longitude));

        try {
          const result = await checkInAtListing(formData);
          setMessage(
            result.flagged
              ? "Checked in — but this location is far from the listing's address. Flagged for review."
              : "Checked in at this property.",
          );
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Could not get your location — check location permissions");
        setLoading(false);
      },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Checking in…" : "Check in at this property"}
      </button>
      {message && <p className="mt-1 text-sm text-verified">{message}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
