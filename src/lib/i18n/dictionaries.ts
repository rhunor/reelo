// Translations live in ./messages/<locale>.json — one flat file per language, keyed the
// same way, so they can be exported to a spreadsheet for translators and imported back
// (scripts/i18n-export.py / scripts/i18n-import.py). English is the default and the
// fallback: any key missing from another language shows in English.
//
// Yorùbá, Hausa, Igbo and Pidgin are first drafts that should be reviewed by native
// speakers. Urhobo is waiting on a translator.
//
// Values can contain {placeholders}, filled in by t("key", { name: value }).
import en from "./messages/en.json";
import yo from "./messages/yo.json";
import ha from "./messages/ha.json";
import ig from "./messages/ig.json";
import pcm from "./messages/pcm.json";
import urh from "./messages/urh.json";
import { interpolate, type TranslateVars } from "./interpolate";

export { interpolate, type TranslateVars };

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locales";
import type { Locale } from "./locales";

export type MessageKey = keyof typeof en;
type Dictionary = Partial<Record<MessageKey, string>>;

const DICTIONARIES: Record<Locale, Dictionary> = { en, yo, ha, ig, pcm, urh };

export type Translator = (key: MessageKey, vars?: TranslateVars) => string;

export function translator(locale: Locale): Translator {
  const dictionary = DICTIONARIES[locale];
  return (key, vars) => interpolate(dictionary[key] || en[key], vars);
}

// The resolved strings for one locale, handed to client components via I18nProvider.
export function clientMessages(locale: Locale): Record<MessageKey, string> {
  const dictionary = DICTIONARIES[locale];
  return Object.fromEntries((Object.keys(en) as MessageKey[]).map((key) => [key, dictionary[key] || en[key]])) as Record<
    MessageKey,
    string
  >;
}
