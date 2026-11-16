"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

type IdType = "nin" | "bvn";

// Labels come from translations: id.<type>.label / .field / .placeholder / .hint
const OPTIONS: { value: IdType }[] = [{ value: "nin" }, { value: "bvn" }];

export function VerifyIdForm({ defaultType = "nin" }: { defaultType?: IdType }) {
  const router = useRouter();
  const { t } = useI18n();
  const idText = (v: IdType, part: "label" | "field" | "placeholder" | "hint") => t(`id.${v}.${part}` as MessageKey);
  const [type, setType] = useState<IdType>(defaultType);
  const [value, setValue] = useState("");
  // Youverify only runs a check with the person's consent, so it's asked for every time.
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const option = OPTIONS.find((o) => o.value === type)!;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(type === "nin" ? "/api/kyc/verify-nin" : "/api/kyc/verify-bvn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "nin" ? { nin: value, consent } : { bvn: value, consent }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.success) {
      setError(data?.message ?? data?.error ?? t("id.failed"));
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-full bg-foreground/5 p-1" role="tablist" aria-label="ID type">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={type === o.value}
            onClick={() => {
              setType(o.value);
              setValue("");
              setError(null);
            }}
            className={`h-9 flex-1 rounded-full text-sm font-medium ${type === o.value ? "bg-background shadow-sm" : "text-foreground/60"}`}
          >
            {idText(o.value, "label")}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {idText(option.value, "field")}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 11))}
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder={idText(option.value, "placeholder")}
          className="rounded-lg border border-line bg-transparent px-3 py-2.5 font-mono"
        />
        <span className="text-xs text-foreground/50">{idText(option.value, "hint")}</span>
      </label>

      <label className="flex items-start gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-clay"
        />
        <span>
          {t("id.consent", { id: idText(option.value, "label") })}{" "}
          <a href="/privacy" target="_blank" className="text-clay underline">
            {t("id.consentPrivacy")}
          </a>
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !value || !consent}
        className="h-11 self-start rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? t("id.verifying") : t("id.verify")}
      </button>
    </form>
  );
}
