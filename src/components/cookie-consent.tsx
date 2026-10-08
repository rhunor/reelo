"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { COOKIE_SETTINGS_EVENT, type ConsentChoice } from "@/lib/consent";

const TRACK_SKIP = /^\/dashboard\/(admin|staff|support)(\/|$)/;

// The cookie banner (until the visitor chooses) plus first-party page-view tracking for
// those who accept "all". Both live here so they share the current choice.
export function CookieConsent({ initialChoice }: { initialChoice: ConsentChoice | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [choice, setChoice] = useState<ConsentChoice | null>(initialChoice);
  const [open, setOpen] = useState(initialChoice === null);
  const [saving, setSaving] = useState(false);
  const firstView = useRef(true);

  // The footer's "Cookie settings" link reopens the banner.
  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  // One page view per navigation, only with consent. Reallow's own staff pages aren't
  // counted, so the numbers reflect customers.
  useEffect(() => {
    if (choice !== "all" || TRACK_SKIP.test(pathname)) return;
    const params = new URLSearchParams(window.location.search);
    const referrer = firstView.current ? document.referrer : undefined;
    firstView.current = false;
    void fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: referrer || undefined,
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
      }),
    }).catch(() => {});
  }, [choice, pathname]);

  async function choose(next: ConsentChoice) {
    setSaving(true);
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: next }),
      });
    } catch {
      // The choice still applies for this visit; it'll be asked again next time.
    }
    setSaving(false);
    setChoice(next);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("cookies.title")}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-4 shadow-2xl sm:bottom-5 sm:p-5"
    >
      <p className="text-sm font-semibold">{t("cookies.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/70">
        {t("cookies.body")}{" "}
        <Link href="/cookies" className="text-clay underline">
          {t("cookies.policyLink")}
        </Link>
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => choose("essential")}
          className="h-10 rounded-full border border-line px-5 text-sm font-medium hover:border-clay hover:text-clay disabled:opacity-50"
        >
          {t("cookies.essentialOnly")}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => choose("all")}
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t("cookies.acceptAll")}
        </button>
      </div>
    </div>
  );
}
