// The languages Reallow offers. Kept apart from dictionaries.ts so client components (the
// language picker) don't bundle every language's messages.
export const LOCALES = [
  { code: "en", label: "English", htmlLang: "en" },
  { code: "yo", label: "Yorùbá", htmlLang: "yo" },
  { code: "ha", label: "Hausa", htmlLang: "ha" },
  { code: "ig", label: "Igbo", htmlLang: "ig" },
  { code: "pcm", label: "Naijá (Pidgin)", htmlLang: "pcm" },
  { code: "urh", label: "Urhobo", htmlLang: "urh" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "reallow-lang";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.code === value);
}
