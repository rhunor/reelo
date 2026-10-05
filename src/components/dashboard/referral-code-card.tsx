"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

export function ReferralCodeCard({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  function copy(kind: "code" | "link") {
    const text = kind === "code" ? code : `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-foreground/50">{t("dash.referralCode")}</span>
      <button
        type="button"
        onClick={() => copy("code")}
        title="Copy code"
        className="rounded-lg border border-dashed border-clay/50 bg-clay/5 px-3 py-1 font-mono text-sm font-semibold tracking-wider text-clay hover:bg-clay/10"
      >
        {copied === "code" ? "Copied!" : code}
      </button>
      <button type="button" onClick={() => copy("link")} className="text-xs text-foreground/60 underline hover:text-clay">
        {copied === "link" ? "✓" : t("dash.copyLink")}
      </button>
    </div>
  );
}
