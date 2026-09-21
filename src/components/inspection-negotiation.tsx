"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InspectionBooking } from "@/types/models";

// Shown to whichever party the booking belongs to — `viewerRole` decides whether this
// person can currently act (they can only accept/counter a proposal the OTHER party made)
// and which "once confirmed" copy they see, per the flow the user specified: the tenant
// gets told how to reach the meeting point, the landlord is told Reallow brings the tenant
// to them.
export function InspectionNegotiation({
  booking,
  viewerRole,
}: {
  booking: InspectionBooking;
  viewerRole: "landlord" | "tenant";
}) {
  const router = useRouter();
  const [counterTime, setCounterTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function respond(body: { action: "accept" } | { action: "counter"; proposedTime: string }) {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/inspection-bookings/${booking._id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not respond to this proposal");
      return;
    }

    router.refresh();
  }

  if (booking.status === "confirmed" && booking.scheduledFor) {
    return (
      <div className="mt-2 rounded-lg border border-verified/40 bg-verified/5 p-3">
        <p className="text-sm font-medium text-verified">
          Inspection confirmed for {new Date(booking.scheduledFor).toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-foreground/70">
          {viewerRole === "tenant"
            ? "Reallow's agent will contact you with how to get to the meeting point."
            : "Reallow's agent will bring the tenant to you."}
        </p>
      </div>
    );
  }

  const isMyTurn = booking.proposedBy && booking.proposedBy !== viewerRole;

  return (
    <div className="mt-2 rounded-lg border border-line p-3">
      <p className="text-sm">
        {booking.proposedBy === viewerRole ? "You suggested" : "Suggested"}{" "}
        {booking.proposedTime && new Date(booking.proposedTime).toLocaleString()}
        {booking.proposedBy === viewerRole && " — waiting on the other party."}
      </p>

      {isMyTurn && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => respond({ action: "accept" })}
              className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Accept this time
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={counterTime}
              onChange={(event) => setCounterTime(event.target.value)}
              className="h-9 rounded-md border border-line bg-transparent px-3 text-sm"
            />
            <button
              type="button"
              disabled={loading || !counterTime}
              onClick={() => respond({ action: "counter", proposedTime: counterTime })}
              className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-50"
            >
              Suggest a different time
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
