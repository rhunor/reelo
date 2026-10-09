"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { SUPPORTED_STATES, DISTRICTS_BY_STATE, type SupportedState } from "@/lib/locations";
import { PROPERTY_TYPES, propertyTypeFields, propertyTypeKey } from "@/lib/property-types";

const inputClass = "h-10 w-full rounded-lg border border-line bg-transparent px-3 text-sm focus:border-clay focus:outline-none";

// Floating "Not finding what you want?" button on /listings. Opens a short form asking
// Reallow's agents to find a property — pre-filled from the visitor's current search.
// Requests land on /dashboard/admin/requests.
export function PropertyRequestButton({
  signedIn,
  initial,
}: {
  signedIn: boolean;
  initial: { listingType?: string; propertyType?: string; state?: string; city?: string; maxPrice?: string };
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [listingType, setListingType] = useState<"rent" | "sale">(initial.listingType === "sale" ? "sale" : "rent");
  const [propertyType, setPropertyType] = useState(
    PROPERTY_TYPES.find((p) => p.toLowerCase() === initial.propertyType?.toLowerCase()) ?? "",
  );
  const [state, setState] = useState<string>(
    SUPPORTED_STATES.find((s) => s.value.toLowerCase() === initial.state?.toLowerCase())?.value ?? SUPPORTED_STATES[0].value,
  );
  const districts = DISTRICTS_BY_STATE[state as SupportedState] ?? [];
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = propertyTypeFields(propertyType);

  // Close with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const value = (name: string) => {
      const v = form.get(name);
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    setSending(true);
    const res = await fetch("/api/property-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingType,
        propertyType,
        state,
        city: value("city"),
        maxBudgetNGN: value("maxBudgetNGN"),
        bedrooms: fields.bedrooms ? value("bedrooms") : undefined,
        details: value("details"),
        name: value("name"),
        phone: value("phone"),
        email: value("email"),
        website: value("website"),
      }),
    });
    const data = await res.json().catch(() => null);
    setSending(false);
    if (!res.ok) {
      setError(data?.error ?? t("request.failed"));
      return;
    }
    setSent(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setOpen(true);
        }}
        className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-clay px-4 py-3 text-left text-sm font-medium text-white shadow-xl transition-transform hover:-translate-y-0.5 sm:right-6 sm:bottom-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m20 20-3.5-3.5M11 8v6M8 11h6" />
        </svg>
        <span className="leading-tight">
          <span className="block">{t("request.cta")}</span>
          <span className="block text-xs font-normal text-white/80">{t("request.ctaSub")}</span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-request-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="property-request-title" className="text-lg font-semibold">
                  {t("request.title")}
                </h2>
                <p className="mt-0.5 text-xs text-foreground/60">{t("request.intro")}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-foreground/5"
              >
                ×
              </button>
            </div>

            {sent ? (
              <div className="mt-6 rounded-xl bg-verified/10 p-4 text-sm">
                <p className="font-medium text-verified">{t("request.sent")}</p>
                <p className="mt-1 text-foreground/70">{t("request.sentBody")}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                {/* Honeypot: hidden from people, filled in by naive bots. */}
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                <div>
                  <p className="mb-1 text-xs font-medium text-foreground/60">{t("request.lookingTo")}</p>
                  <div className="flex gap-2">
                    {(["rent", "sale"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setListingType(option)}
                        className={`h-10 flex-1 rounded-full border text-sm font-medium ${
                          listingType === option ? "border-transparent bg-clay text-white" : "border-line"
                        }`}
                      >
                        {t(option === "rent" ? "request.rent" : "request.buy")}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                  {t("form.propertyType")}
                  <select
                    required
                    value={propertyType}
                    onChange={(event) => setPropertyType(event.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t("common.chooseOne")}
                    </option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(propertyTypeKey(type) as MessageKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                    {t("request.state")}
                    <select value={state} onChange={(event) => setState(event.target.value)} className={inputClass}>
                      {SUPPORTED_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                    {t("request.area")}
                    <select
                      key={state}
                      name="city"
                      defaultValue={districts.some((d) => d.value === initial.city) ? initial.city : ""}
                      className={inputClass}
                    >
                      <option value="">{t("request.anyArea")}</option>
                      {districts.map((district) => (
                        <option key={district.value} value={district.value}>
                          {district.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={`grid gap-2 ${fields.bedrooms ? "grid-cols-2" : "grid-cols-1"}`}>
                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                    {t(listingType === "rent" ? "request.budgetRent" : "request.budgetSale")}
                    <input
                      name="maxBudgetNGN"
                      type="number"
                      min={1}
                      defaultValue={initial.maxPrice}
                      placeholder={t("request.optional")}
                      className={inputClass}
                    />
                  </label>
                  {fields.bedrooms && (
                    <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                      {t("form.bedrooms")}
                      <input name="bedrooms" type="number" min={0} max={20} placeholder={t("request.optional")} className={inputClass} />
                    </label>
                  )}
                </div>

                <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
                  {t("request.details")}
                  <textarea
                    name="details"
                    rows={3}
                    maxLength={1000}
                    placeholder={t("request.detailsPlaceholder")}
                    className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm focus:border-clay focus:outline-none"
                  />
                </label>

                {signedIn ? (
                  <p className="text-xs text-foreground/50">{t("request.signedInNote")}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input name="name" required minLength={2} placeholder={t("contact.yourName")} className={inputClass} />
                    <input name="phone" required type="tel" placeholder={t("request.phone")} className={inputClass} />
                    <input name="email" type="email" placeholder={t("request.emailOptional")} className={`${inputClass} sm:col-span-2`} />
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={sending || !propertyType}
                  className="h-11 rounded-full bg-clay text-sm font-medium text-white disabled:opacity-50"
                >
                  {sending ? t("common.sending") : t("request.submit")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
