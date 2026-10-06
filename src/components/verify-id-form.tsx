"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type IdType = "nin" | "drivers_licence";

const OPTIONS: { value: IdType; label: string; field: string; placeholder: string; hint: string }[] = [
  {
    value: "nin",
    label: "NIN",
    field: "National Identification Number",
    placeholder: "11-digit NIN",
    hint: "On your NIN slip or national ID card. Dial *346# to retrieve it.",
  },
  {
    value: "drivers_licence",
    label: "Driver's licence",
    field: "Driver's licence number",
    placeholder: "e.g. ABC12345DE67",
    hint: "The licence number printed on the front of your card.",
  },
];

export function VerifyIdForm({ defaultType = "nin" }: { defaultType?: IdType }) {
  const router = useRouter();
  const [type, setType] = useState<IdType>(defaultType);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const option = OPTIONS.find((o) => o.value === type)!;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(type === "nin" ? "/api/kyc/verify-nin" : "/api/kyc/verify-drivers-licence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "nin" ? { nin: value } : { licenceNumber: value }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.success) {
      setError(data?.message ?? data?.error ?? "We couldn't verify that number. Check it and try again.");
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
            {o.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {option.field}
        <input
          value={value}
          onChange={(event) => setValue(type === "nin" ? event.target.value.replace(/\D/g, "").slice(0, 11) : event.target.value.toUpperCase())}
          inputMode={type === "nin" ? "numeric" : "text"}
          autoComplete="off"
          required
          placeholder={option.placeholder}
          className="rounded-lg border border-line bg-transparent px-3 py-2.5 font-mono"
        />
        <span className="text-xs text-foreground/50">{option.hint}</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !value}
        className="h-11 self-start rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify identity"}
      </button>
    </form>
  );
}
