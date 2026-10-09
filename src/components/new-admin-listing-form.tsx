"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { COMPLETION_STATUSES, PROPERTY_TYPES, propertyTypeFields, type CompletionStatus } from "@/lib/property-types";
import { SUPPORTED_STATES, DISTRICTS_BY_STATE, type SupportedState } from "@/lib/locations";
import { CAUTION_FEE_CAP_RATE } from "@/lib/fees";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";

const inputClass = "rounded-md border border-line px-3 py-2 bg-transparent";

const COMPLETION_LABEL: Record<CompletionStatus, string> = {
  completed: "Completed",
  carcass: "Carcass (shell)",
  under_construction: "Under construction / off-plan",
};

export function NewAdminListingForm() {
  const router = useRouter();
  const [listingType, setListingType] = useState<"rent" | "sale">("rent");
  const [furnishing, setFurnishing] = useState<"furnished" | "semi_furnished" | "unfurnished">(
    "unfurnished",
  );
  const [propertyType, setPropertyType] = useState("");
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const fields = propertyTypeFields(propertyType);
  const needsCompletion = listingType === "sale" && fields.completion;
  const [state, setState] = useState<SupportedState>(SUPPORTED_STATES[0].value);
  const districts = DISTRICTS_BY_STATE[state] ?? [];
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (photoUrls.length === 0) {
      setError("Upload at least one photo");
      return;
    }
    if (needsCompletion && !completionStatus) {
      setError("Say whether the building is completed, a carcass, or under construction");
      return;
    }

    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      landlordEmail: formData.get("landlordEmail"),
      title: formData.get("title"),
      description: formData.get("description"),
      listingType,
      propertyType,
      priceNGN: formData.get("priceNGN"),
      depositNGN: Number(formData.get("depositNGN")) || undefined,
      estateChargeNGN: Number(formData.get("estateChargeNGN")) || undefined,
      minimumTermMonths: formData.get("minimumTermMonths") || undefined,
      state: formData.get("state"),
      city: formData.get("city"),
      area: formData.get("area") || undefined,
      bedrooms: fields.bedrooms ? formData.get("bedrooms") || undefined : undefined,
      bathrooms: fields.bathrooms ? formData.get("bathrooms") || undefined : undefined,
      furnishing: fields.furnishing ? furnishing : undefined,
      completionStatus: needsCompletion ? completionStatus ?? undefined : undefined,
      amenities: formData.get("amenities") || undefined,
      tenantPreferences: formData.get("tenantPreferences") || undefined,
      photoUrls,
      videoUrls,
    };

    const res = await fetch("/api/admin/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not create listing");
      return;
    }

    const { id } = await res.json();
    router.push(`/listings/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <div>
        <input
          name="landlordEmail"
          type="email"
          placeholder="Landlord's account email (optional)"
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Leave blank to list this property as Reallow itself rather than an outside landlord.
        </p>
      </div>
      <input name="title" placeholder="Title" required className={inputClass} />
      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={4}
        className={inputClass}
      />

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

      <select
        name="propertyType"
        required
        value={propertyType}
        onChange={(event) => setPropertyType(event.target.value)}
        className={inputClass}
      >
        <option value="" disabled>
          Property type
        </option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {listingType === "rent" ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input name="priceNGN" type="number" min={1} placeholder="Rent (₦/year)" required className={inputClass} />
            <input name="depositNGN" type="number" min={0} placeholder="Caution fee (₦, optional)" className={inputClass} />
          </div>
          <p className="-mt-2 text-xs text-foreground/50">
            Caution fee can&apos;t exceed {CAUTION_FEE_CAP_RATE * 100}% of annual rent.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input name="estateChargeNGN" type="number" min={0} placeholder="Estate charge (₦, optional)" className={inputClass} />
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
        // Sale listings have no caution fee, estate charge, or minimum tenancy.
        <input key="sale-price" name="priceNGN" type="number" min={1} placeholder="Sale price (₦)" required className={inputClass} />
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

      {needsCompletion && (
        <div className="grid gap-2 sm:grid-cols-3">
          {COMPLETION_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCompletionStatus(option)}
              className={`rounded-full border px-3 py-2 text-xs font-medium ${
                completionStatus === option ? "border-transparent bg-clay text-white" : "border-line"
              }`}
            >
              {COMPLETION_LABEL[option]}
            </button>
          ))}
        </div>
      )}

      {(fields.bedrooms || fields.bathrooms) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.bedrooms && <input name="bedrooms" type="number" min={0} placeholder="Bedrooms" className={inputClass} />}
          {fields.bathrooms && (
            <input
              name="bathrooms"
              type="number"
              min={0}
              placeholder={fields.bedrooms ? "Bathrooms" : "Toilets"}
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
              {option.replace("_", "-")}
            </button>
          ))}
        </div>
      )}

      <input name="amenities" placeholder="Amenities, comma separated (optional)" className={inputClass} />

      <textarea
        name="tenantPreferences"
        placeholder="Landlord's tenant preferences (optional)"
        rows={2}
        className={inputClass}
      />

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
        {loading ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}
