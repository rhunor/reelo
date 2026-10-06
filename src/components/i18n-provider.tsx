"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale, MessageKey } from "@/lib/i18n/dictionaries";
import { interpolate, type TranslateVars } from "@/lib/i18n/interpolate";

const I18nContext = createContext<{ locale: Locale; messages: Record<MessageKey, string> } | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<MessageKey, string>;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return {
    locale: context.locale,
    t: (key: MessageKey, vars?: TranslateVars) => interpolate(context.messages[key], vars),
  };
}
