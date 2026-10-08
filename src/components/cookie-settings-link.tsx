"use client";

import { COOKIE_SETTINGS_EVENT } from "@/lib/consent";

// Reopens the cookie banner so a visitor can change their choice at any time.
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
      className="text-left hover:text-clay"
    >
      {label}
    </button>
  );
}
