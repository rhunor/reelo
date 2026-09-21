"use client";

import { useRef, useState } from "react";

const SUMMARY = `Reallow connects you directly with the other party through Reallow — you never contact each other yourselves until a deal actually closes, Reallow coordinates everything up to that point.

Anyone can start a listing free of charge, but it won't be visible to others until Reallow verifies it in person — and Reallow won't do that until your own identity is verified. You'll need to verify your National Identification Number (NIN) and Bank Verification Number (BVN) before you can apply for a listing, book a paid inspection, or have a listing published. The name on your NIN, BVN, bank account, and profile must all match — Reallow won't pay out to a name that doesn't correspond with your verified identity. Each NIN, BVN, phone number, and email can only ever be linked to one Reallow account.

Every payment — inspection fees, rent, caution fees, estate charges, Reallow's agency fee, and the legal fee — goes into Reallow's own account, never directly to another user. Once rent or the sale price is paid and the property changes hands, that deal is complete — anything after that is between the two of you. The one thing Reallow keeps holding is the caution fee, to protect both sides and make the refund straightforward once the tenancy ends.

Reallow collects your identity and bank details for verification and payout purposes only — they're never shown to other users or sold. You control whether optional profile details (occupation, marital status, religion, profile picture) are visible to others.

Reallow can suspend any account or remove any listing for misconduct or suspected misconduct, and you can report a user or a listing directly from their page.

By creating an account you agree to the full Terms of Service and Privacy Policy, linked below.`;

export function TermsScrollAccept() {
  const [open, setOpen] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setReachedBottom(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="termsAccepted"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          required
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <button type="button" onClick={() => setOpen(true)} className="text-clay underline">
            Terms of Service and Privacy Policy
          </button>{" "}
          <span className="text-foreground/50">(tap to read them first, or just tick to agree)</span>
        </span>
      </label>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Terms of Service &amp; Privacy Policy</h2>
            <p className="mt-1 text-xs text-foreground/50">Scroll to the bottom to continue.</p>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="mt-4 flex-1 overflow-y-auto whitespace-pre-line rounded-lg border border-line p-4 text-sm leading-relaxed text-foreground/80"
            >
              {SUMMARY}
              <p className="mt-4 text-xs text-foreground/50">
                Full text: <a href="/terms" target="_blank" className="underline">Terms of Service</a> ·{" "}
                <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>
              </p>
            </div>
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
                disabled={!reachedBottom}
                onClick={() => {
                  setAccepted(true);
                  setOpen(false);
                }}
                className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                I agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
