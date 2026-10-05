"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { SUPPORTED_STATES, DISTRICTS_BY_STATE, type SupportedState } from "@/lib/locations";
import { CAUTION_FEE_CAP_RATE, computeListingCostBreakdown, formatRate } from "@/lib/fees";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";

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
  furnishing: "furnished" | "semi_furnished" | "unfurnished";
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
  const [listingType, setListingType] = useState<"rent" | "sale">("rent");
  const [furnishing, setFurnishing] = useState<"furnished" | "semi_furnished" | "unfurnished">(
    "unfurnished",
  );
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (photoUrls.length === 0) {
      setError("Upload at least one photo");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const priceNGN = num(formData, "priceNGN") ?? 0;
    // 0 means "none" — the API only accepts positive optional amounts.
    const depositNGN = isRent ? num(formData, "depositNGN") || undefined : undefined;
    if (depositNGN && depositNGN > priceNGN * CAUTION_FEE_CAP_RATE) {
      setError(`Caution fee can't exceed ${CAUTION_FEE_CAP_RATE * 100}% of annual rent`);
      return;
    }

    setReview({
      title: text(formData, "title") ?? "",
      description: text(formData, "description"),
      listingType,
      propertyType: text(formData, "propertyType") ?? "",
      priceNGN,
      // Sale listings carry no caution fee, estate charge, or minimum tenancy.
      depositNGN,
      estateChargeNGN: isRent ? num(formData, "estateChargeNGN") || undefined : undefined,
      minimumTermMonths: isRent ? num(formData, "minimumTermMonths") : undefined,
      state: text(formData, "state") ?? "",
      city: text(formData, "city") ?? "",
      area: text(formData, "area"),
      fullAddress: text(formData, "fullAddress") ?? "",
      bedrooms: num(formData, "bedrooms"),
      bathrooms: num(formData, "bathrooms"),
      furnishing,
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
      setError(data?.error ?? "Could not create listing");
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
      <input name="title" placeholder="Title" required className={inputClass} />
      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={4}
        className={inputClass}
      />
      <p className="-mt-2 text-xs text-foreground/50">
        Don&apos;t include phone numbers, emails, or social handles anywhere in your listing — Reallow handles all
        contact with applicants.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setListingType("rent")}
          className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
            listingType === "rent" ? "border-transparent bg-clay text-white" : "border-line"
          }`}
        >
          For rent
        </button>
        <button
          type="button"
          onClick={() => setListingType("sale")}
          className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
            listingType === "sale" ? "border-transparent bg-clay text-white" : "border-line"
          }`}
        >
          For sale
        </button>
      </div>

      <select name="propertyType" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Property type
        </option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
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
              placeholder="Rent (₦/year)"
              required
              className={inputClass}
            />
            <input
              name="depositNGN"
              type="number"
              min={0}
              placeholder="Caution fee (₦, optional)"
              className={inputClass}
            />
          </div>
          <p className="-mt-2 text-xs text-foreground/50">
            Caution fee can&apos;t exceed {CAUTION_FEE_CAP_RATE * 100}% of annual rent.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              name="estateChargeNGN"
              type="number"
              min={0}
              placeholder="Estate charge (₦, optional)"
              className={inputClass}
            />
            <input
              name="minimumTermMonths"
              type="number"
              min={MINIMUM_LEASE_TERM_MONTHS}
              placeholder={`Minimum tenancy (months, min. ${MINIMUM_LEASE_TERM_MONTHS})`}
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
          placeholder="Sale price (₦)"
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
            District
          </option>
          {districts.map((district) => (
            <option key={district.value} value={district.value}>
              {district.label}
            </option>
          ))}
        </select>
        <input name="area" placeholder="Estate / street (optional)" className={inputClass} />
      </div>

      <div>
        <textarea
          name="fullAddress"
          placeholder="Full property address"
          required
          minLength={5}
          rows={2}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Used only by Reallow to verify this property in person — never shown publicly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input name="bedrooms" type="number" min={0} placeholder="Bedrooms" className={inputClass} />
        <input name="bathrooms" type="number" min={0} placeholder="Bathrooms" className={inputClass} />
      </div>

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
            {option.replace("_", "-")}
          </button>
        ))}
      </div>

      <input name="amenities" placeholder="Amenities, comma separated (optional)" className={inputClass} />

      <div>
        <textarea
          name="tenantPreferences"
          placeholder="Who are you looking for? (optional — e.g. working professional, no pets, minimum 2-year stay)"
          rows={2}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Shown publicly on the listing. Describe the situation you&apos;re looking for, not a
          person&apos;s background — Reallow won&apos;t publish preferences based on protected
          characteristics.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm">Photos</p>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} />
      </div>

      <div>
        <p className="mb-2 text-sm">Videos (optional)</p>
        <VideoUploader value={videoUrls} onChange={setVideoUrls} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay text-white disabled:opacity-50"
      >
        Review listing
      </button>
    </form>
    </>
  );
}

const FURNISHING_LABEL: Record<ListingPayload["furnishing"], string> = {
  furnished: "Furnished",
  semi_furnished: "Semi-furnished",
  unfurnished: "Unfurnished",
};

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
  const isRent = review.listingType === "rent";
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
    ["Title", review.title],
    ["Listing type", isRent ? "For rent" : "For sale"],
    ["Property type", review.propertyType],
    ["Location", [review.area, district, stateLabel].filter(Boolean).join(", ")],
    ["Full address", review.fullAddress],
    ["Bedrooms", review.bedrooms?.toString()],
    ["Bathrooms", review.bathrooms?.toString()],
    ["Furnishing", FURNISHING_LABEL[review.furnishing]],
    [
      "Minimum tenancy",
      isRent
        ? `${review.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS} month${
            (review.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS) === 1 ? "" : "s"
          }`
        : undefined,
    ],
    ["Amenities", review.amenities],
    ["Who you're looking for", review.tenantPreferences],
    ["Description", review.description],
    [
      "Media",
      `${review.photoUrls.length} photo${review.photoUrls.length === 1 ? "" : "s"}` +
        (review.videoUrls.length
          ? `, ${review.videoUrls.length} video${review.videoUrls.length === 1 ? "" : "s"}`
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
        <h2 className="text-xl font-semibold tracking-tight">Review your listing</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Check everything below, then confirm. You can go back and edit anything first.
        </p>
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
        <h3 className="text-sm font-medium">Property details</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className={label === "Description" || label === "Full address" ? "sm:col-span-2" : ""}>
                <dt className="text-xs text-foreground/50">{label}</dt>
                <dd className="mt-0.5 break-words">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-line p-5">
        <h3 className="text-sm font-medium">Cost breakdown</h3>
        <p className="mt-1 text-xs text-foreground/50">
          What the {isRent ? "tenant" : "buyer"} pays through Reallow, and where it goes.
        </p>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          {row(isRent ? "Rent (per year)" : "Sale price", breakdown.priceNGN, "text-foreground/80")}
          {isRent && row("Caution fee", breakdown.cautionFeeNGN, "text-foreground/80")}
          {isRent && row("Estate charge", breakdown.estateChargeNGN, "text-foreground/80")}
          {row(
            `Reallow service charge (${formatRate(breakdown.serviceChargeRate)} of ${isRent ? "rent" : "price"})`,
            breakdown.serviceChargeNGN,
            "text-foreground/80",
          )}
          {row(
            `Total the ${isRent ? "tenant" : "buyer"} pays`,
            breakdown.totalNGN,
            "mt-1 border-t border-line pt-3 font-medium",
          )}
        </dl>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-verified/10 p-4">
            <dt className="text-xs text-foreground/60">Amount going to you</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">{naira(breakdown.toOwnerNGN)}</dd>
            <p className="mt-1 text-xs text-foreground/50">
              {isRent ? "Rent + caution fee + estate charge" : "The full sale price"}
            </p>
          </div>
          <div className="rounded-xl bg-foreground/5 p-4">
            <dt className="text-xs text-foreground/60">Going to Reallow</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">{naira(breakdown.toReallowNGN)}</dd>
            <p className="mt-1 text-xs text-foreground/50">Service charge, paid by the {isRent ? "tenant" : "buyer"}</p>
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
          Edit listing
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="h-11 flex-1 rounded-full bg-clay text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Confirm listing"}
        </button>
      </div>
    </div>
  );
}
