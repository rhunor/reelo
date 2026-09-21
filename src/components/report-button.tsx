"use client";

import { useState } from "react";

const REASONS = [
  "Suspicious or fraudulent",
  "Misleading information",
  "Inappropriate behavior",
  "Not who they claim to be",
  "Other",
];

export function ReportButton({
  targetType,
  targetId,
  label,
}: {
  targetType: "user" | "listing";
  targetId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, details: details || undefined }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not submit report");
      return;
    }

    setSent(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground/50 underline hover:text-red-600"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {sent ? (
              <>
                <h2 className="text-lg font-semibold">Report sent</h2>
                <p className="mt-2 text-sm text-foreground/70">
                  Reallow will look into this. Thanks for flagging it.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 h-10 rounded-full bg-clay px-5 text-sm font-medium text-white"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{label}</h2>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-4 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
                >
                  {REASONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Any details that would help Reallow investigate (optional)"
                  rows={3}
                  className="mt-2 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-10 rounded-full border border-line px-4 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={submit}
                    className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
