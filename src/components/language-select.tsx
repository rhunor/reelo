"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n/dictionaries";

const SHORT: Record<Locale, string> = { en: "EN", yo: "YO", ha: "HA", ig: "IG", pcm: "PCM", urh: "URH" };

// `compact` is the header version: globe + short code, full names in the dropdown.
export function LanguageSelect({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  function choose(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = LOCALES.find((l) => l.code === next)!.htmlLang;
    router.refresh();
  }

  return (
    <label className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-foreground/50" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
      </svg>
      <span className="sr-only">{t("settings.language")}</span>
      <select
        value={locale}
        onChange={(event) => choose(event.target.value as Locale)}
        title={t("settings.language")}
        className={
          compact
            ? "h-9 cursor-pointer rounded-full border border-line bg-transparent pr-1 pl-2 text-xs font-medium hover:border-clay"
            : "rounded-md border border-line bg-transparent px-2 py-1 text-sm"
        }
      >
        {LOCALES.map((option) => (
          <option key={option.code} value={option.code}>
            {compact ? `${SHORT[option.code]} · ${option.label}` : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
