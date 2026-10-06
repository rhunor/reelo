"use client";

import { useI18n } from "@/components/i18n-provider";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("common.somethingWrong")}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("error.title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/70">
        {t("error.body")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("error.retry")}
      </button>
    </div>
  );
}
