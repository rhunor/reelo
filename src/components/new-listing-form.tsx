"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { SUPPORTED_STATES, DISTRICTS_BY_STATE, type SupportedState } from "@/lib/locations";
import { CAUTION_FEE_CAP_RATE, computeListingCostBreakdown, formatRate } from "@/lib/fees";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";
import { COMPLETION_STATUSES, propertyTypeFields, propertyTypeKey, type CompletionStatus } from "@/lib/property-types";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

const inputClass = "rounded-md border border-line px-3 py-2 bg-transparent";

type ListingPayload = {
  title: string;
  description?: string;
  listingType: "rent" | "sale";
  propertyType: string;
  priceNGN: number;
  depositNGN?: number;
  estateChargeNGN?: number;
  minimumTermMonths?: number;
  state: string;
  city: string;
  area?: string;
  fullAddress: string;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: "furnished" | "semi_furnished" | "unfurnished";
  completionStatus?: CompletionStatus;
  amenities?: string;
  tenantPreferences?: string;
  photoUrls: string[];
  videoUrls: string[];
};

const naira = (amount: number) => `₦${amount.toLocaleString()}`;

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(formData: FormData, name: string): number | undefined {
  const value = text(formData, name);
  return value === undefined ? undefined : Number(value);
}

export function NewListingForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [listingType, setListingType] = useState<"rent" | "sale">("rent");
  const [furnishing, setFurnishing] = useState<"furnished" | "semi_furnished" | "unfurnished">(
    "unfurnished",
  );
  const [propertyType, setPropertyType] = useState("");
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  // Which details apply to the chosen type (no furnishing or bedrooms for land, etc.).
  const fields = propertyTypeFields(propertyType);
  const [state, setState] = useState<SupportedState>(SUPPORTED_STATES[0].value);
  const districts = DISTRICTS_BY_STATE[state] ?? [];
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set once the form passes validation — the review screen renders from this, and
  // "Confirm listing" posts exactly what the landlord reviewed.
  const [review, setReview] = useState<ListingPayload | null>(null);
  const isRent = listingType === "rent";
  const needsCompletion = !isRent && fields.completion;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (photoUrls.length === 0) {
      setError(t("form.needPhoto"));
      return;
    }

    if (needsCompletion && !completionStatus) {
      setError(t("form.completionRequired"));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const priceNGN = num(formData, "priceNGN") ?? 0;
    // 0 means "none" — the API only accepts positive optional amounts.
    const depositNGN = isRent ? num(formData, "depositNGN") || undefined : undefined;
    if (depositNGN && depositNGN > priceNGN * CAUTION_FEE_CAP_RATE) {
      setError(t("form.cautionCap", { pct: CAUTION_FEE_CAP_RATE * 100 }));
      return;
    }

    setReview({
      title: text(formData, "title") ?? "",
      description: text(formData, "description"),
      listingType,
      propertyType,
      priceNGN,
      // Sale listings carry no caution fee, estate charge, or minimum tenancy.
      depositNGN,
      estateChargeNGN: isRent ? num(formData, "estateChargeNGN") || undefined : undefined,
      minimumTermMonths: isRent ? num(formData, "minimumTermMonths") : undefined,
      state: text(formData, "state") ?? "",
      city: text(formData, "city") ?? "",
      area: text(formData, "area"),
      fullAddress: text(formData, "fullAddress") ?? "",
      bedrooms: fields.bedrooms ? num(formData, "bedrooms") : undefined,
      bathrooms: fields.bathrooms ? num(formData, "bathrooms") : undefined,
      furnishing: fields.furnishing ? furnishing : undefined,
      completionStatus: needsCompletion ? completionStatus ?? undefined : undefined,
      amenities: text(formData, "amenities"),
      tenantPreferences: text(formData, "tenantPreferences"),
      photoUrls,
      videoUrls,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmListing() {
    if (!review) return;
    setError(null);
    setLoading(true);

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("form.createFailed"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      {review && (
        <ListingReview
          review={review}
          error={error}
          loading={loading}
          onEdit={() => {
            setReview(null);
            setError(null);
          }}
          onConfirm={confirmListing}
        />
      )}
    <form onSubmit={handleSubmit} className={`mt-8 flex flex-col gap-4 ${review ? "hidden" : ""}`}>
      <input name="title" placeholder={t("form.title")} required className={inputClass} />
      <textarea
        name="description"
        placeholder={t("form.description")}
        rows={4}
        className={inputClass}
      />
      <p className="-mt-2 text-xs text-foreground/50">
        {t("form.noContactInfo")}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setListingType("rent")}
          className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
            listingType === "rent" ? "border-transparent bg-clay text-white" : "border-line"
          }`}
        >
          {t("listing.forRent")}
        </button>
        <button
          type="button"
          onClick={() => setListingType("sale")}
          className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
            listingType === "sale" ? "border-transparent bg-clay text-white" : "border-line"
          }`}
        >
          {t("listing.forSale")}
        </button>
      </div>

      <select
        name="propertyType"
        required
        value={propertyType}
        onChange={(event) => setPropertyType(event.target.value)}
        className={inputClass}
      >
        <option value="" disabled>
          {t("form.propertyType")}
        </option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(propertyTypeKey(type) as MessageKey)}
          </option>
        ))}
      </select>

      {isRent ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              name="priceNGN"
              type="number"
              min={1}
              placeholder={t("form.rentPerYear")}
              required
              className={inputClass}
            />
            <input
              name="depositNGN"
              type="number"
              min={0}
              placeholder={t("form.cautionOptional")}
              className={inputClass}
            />
          </div>
          <p className="-mt-2 text-xs text-foreground/50">
            {t("form.cautionCap", { pct: CAUTION_FEE_CAP_RATE * 100 })}.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              name="estateChargeNGN"
              type="number"
              min={0}
              placeholder={t("form.estateOptional")}
              className={inputClass}
            />
            <input
              name="minimumTermMonths"
              type="number"
              min={MINIMUM_LEASE_TERM_MONTHS}
              placeholder={t("form.minTenancy", { min: MINIMUM_LEASE_TERM_MONTHS })}
              className={inputClass}
            />
          </div>
        </>
      ) : (
        <input
          // Distinct key so switching type doesn't carry the rent figure over as a sale price.
          key="sale-price"
          name="priceNGN"
          type="number"
          min={1}
          placeholder={t("form.salePrice")}
          required
          className={inputClass}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <select
          name="state"
          required
          value={state}
          onChange={(event) => setState(event.target.value as SupportedState)}
          className={inputClass}
        >
          {SUPPORTED_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="city" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            {t("form.district")}
          </option>
          {districts.map((district) => (
            <option key={district.value} value={district.value}>
              {district.label}
            </option>
          ))}
        </select>
        <input name="area" placeholder={t("form.area")} className={inputClass} />
      </div>

      <div>
        <textarea
          name="fullAddress"
          placeholder={t("form.fullAddress")}
          required
          minLength={5}
          rows={2}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">
          {t("form.fullAddressHint")}
        </p>
      </div>

      {needsCompletion && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("form.completion")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMPLETION_STATUSES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCompletionStatus(option)}
                className={`flex flex-col rounded-xl border px-3 py-2 text-left text-sm ${
                  completionStatus === option ? "border-clay bg-clay/5" : "border-line"
                }`}
              >
                <span className="font-medium">{t(`completion.${option}` as MessageKey)}</span>
                <span className="text-xs text-foreground/50">{t(`completion.${option}.hint` as MessageKey)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {(fields.bedrooms || fields.bathrooms) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.bedrooms && (
            <input name="bedrooms" type="number" min={0} placeholder={t("form.bedrooms")} className={inputClass} />
          )}
          {fields.bathrooms && (
            <input
              name="bathrooms"
              type="number"
              min={0}
              placeholder={t(fields.bedrooms ? "form.bathrooms" : "form.toilets")}
              className={inputClass}
            />
          )}
        </div>
      )}

      {fields.furnishing && (
        <div className="flex gap-2">
          {(["unfurnished", "semi_furnished", "furnished"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFurnishing(option)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium capitalize ${
                furnishing === option ? "border-transparent bg-clay text-white" : "border-line"
              }`}
            >
              {t(`furnishing.${option}` as MessageKey)}
            </button>
          ))}
        </div>
      )}

      <input name="amenities" placeholder={t("form.amenities")} className={inputClass} />

      <div>
        <textarea
          name="tenantPreferences"
          placeholder={t("form.lookingFor")}
          rows={2}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">
          {t("form.lookingForHint")}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm">{t("form.photos")}</p>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} />
      </div>

      <div>
        <p className="mb-2 text-sm">{t("form.videos")}</p>
        <VideoUploader value={videoUrls} onChange={setVideoUrls} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay text-white disabled:opacity-50"
      >
        {t("form.review")}
      </button>
    </form>
    </>
  );
}



function ListingReview({
  review,
  error,
  loading,
  onEdit,
  onConfirm,
}: {
  review: ListingPayload;
  error: string | null;
  loading: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const isRent = review.listingType === "rent";
  const party = t(isRent ? "form.tenant" : "form.buyer");
  const breakdown = computeListingCostBreakdown({
    listingType: review.listingType,
    priceNGN: review.priceNGN,
    cautionFeeNGN: review.depositNGN,
    estateChargeNGN: review.estateChargeNGN,
  });
  const district =
    DISTRICTS_BY_STATE[review.state as SupportedState]?.find((d) => d.value === review.city)?.label ??
    review.city;
  const stateLabel = SUPPORTED_STATES.find((s) => s.value === review.state)?.label ?? review.state;

  const details: Array<[string, string | undefined]> = [
    ["form.title", review.title],
    ["form.listingType", t(isRent ? "listing.forRent" : "listing.forSale")],
    ["form.propertyType", t(propertyTypeKey(review.propertyType) as MessageKey)],
    ["form.location", [review.area, district, stateLabel].filter(Boolean).join(", ")],
    ["form.fullAddress", review.fullAddress],
    ["form.completion", review.completionStatus ? t(`completion.${review.completionStatus}` as MessageKey) : undefined],
    ["form.bedrooms", review.bedrooms?.toString()],
    [propertyTypeFields(review.propertyType).bedrooms ? "form.bathrooms" : "form.toilets", review.bathrooms?.toString()],
    ["form.furnishing", review.furnishing ? t(`furnishing.${review.furnishing}` as MessageKey) : undefined],
    [
      "form.minimumTenancy",
      isRent
        ? t((review.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS) === 1 ? "form.monthOne" : "form.months", {
            count: review.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS,
          })
        : undefined,
    ],
    ["form.amenitiesLabel", review.amenities],
    ["form.lookingForLabel", review.tenantPreferences],
    ["form.descriptionLabel", review.description],
    [
      "form.media",
      t(review.photoUrls.length === 1 ? "form.photoOne" : "form.photoMany", { count: review.photoUrls.length }) +
        (review.videoUrls.length
          ? `, ${t(review.videoUrls.length === 1 ? "form.videoOne" : "form.videoMany", { count: review.videoUrls.length })}`
          : ""),
    ],
  ];

  const row = (label: string, amount: number, className = "") => (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <dt>{label}</dt>
      <dd className="font-mono">{naira(amount)}</dd>
    </div>
  );

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("form.reviewTitle")}</h2>
        <p className="mt-1 text-sm text-foreground/60">{t("form.reviewIntro")}</p>
      </div>

      {review.photoUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {review.photoUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-line p-5">
        <h3 className="text-sm font-medium">{t("form.propertyDetails")}</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className={label === "form.descriptionLabel" || label === "form.fullAddress" ? "sm:col-span-2" : ""}>
                <dt className="text-xs text-foreground/50">{t(label as MessageKey)}</dt>
                <dd className="mt-0.5 break-words">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-line p-5">
        <h3 className="text-sm font-medium">{t("form.costBreakdown")}</h3>
        <p className="mt-1 text-xs text-foreground/50">{t("form.costIntro", { party })}</p>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          {row(t(isRent ? "listing.rentPerYear" : "listing.salePrice"), breakdown.priceNGN, "text-foreground/80")}
          {/* Optional charges only appear when the owner actually set one. */}
          {isRent && breakdown.cautionFeeNGN > 0 && row(t("listing.cautionFee"), breakdown.cautionFeeNGN, "text-foreground/80")}
          {isRent && breakdown.estateChargeNGN > 0 && row(t("listing.estateCharge"), breakdown.estateChargeNGN, "text-foreground/80")}
          {row(
            t(isRent ? "form.serviceOfRent" : "form.serviceOfPrice", { rate: formatRate(breakdown.serviceChargeRate) }),
            breakdown.serviceChargeNGN,
            "text-foreground/80",
          )}
          {row(
            t("form.totalParty", { party }),
            breakdown.totalNGN,
            "mt-1 border-t border-line pt-3 font-medium",
          )}
        </dl>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-verified/10 p-4">
            <dt className="text-xs text-foreground/60">{t("form.toYou")}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">{naira(breakdown.toOwnerNGN)}</dd>
            <p className="mt-1 text-xs text-foreground/50">
              {isRent
                ? [
                    t("txType.rent"),
                    breakdown.cautionFeeNGN > 0 && t("listing.cautionFee").toLowerCase(),
                    breakdown.estateChargeNGN > 0 && t("listing.estateCharge").toLowerCase(),
                  ]
                    .filter(Boolean)
                    .join(" + ")
                : t("form.toYouSale")}
            </p>
          </div>
          <div className="rounded-xl bg-foreground/5 p-4">
            <dt className="text-xs text-foreground/60">{t("form.toReallow")}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">{naira(breakdown.toReallowNGN)}</dd>
            <p className="mt-1 text-xs text-foreground/50">{t("form.toReallowNote", { party })}</p>
          </div>
        </dl>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className="h-11 flex-1 rounded-full border border-line text-sm font-medium disabled:opacity-50"
        >
          {t("form.edit")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="h-11 flex-1 rounded-full bg-clay text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? t("form.submitting") : t("form.confirm")}
        </button>
      </div>
    </div>
  );
}
