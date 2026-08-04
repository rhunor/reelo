"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";

const inputClass =
  "rounded-md border border-line px-3 py-2 bg-transparent";

export default function NewListingPage() {
  const router = useRouter();
  const [listingType, setListingType] = useState<"rent" | "sale">("rent");
  const [furnishing, setFurnishing] = useState<"furnished" | "semi_furnished" | "unfurnished">(
    "unfurnished",
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (photoUrls.length === 0) {
      setError("Upload at least one photo");
      return;
    }

    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      listingType,
      propertyType: formData.get("propertyType"),
      priceNGN: formData.get("priceNGN"),
      depositNGN: formData.get("depositNGN") || undefined,
      state: formData.get("state"),
      city: formData.get("city"),
      area: formData.get("area") || undefined,
      bedrooms: formData.get("bedrooms") || undefined,
      bathrooms: formData.get("bathrooms") || undefined,
      furnishing,
      amenities: formData.get("amenities") || undefined,
      photoUrls,
    };

    const res = await fetch("/api/listings", {
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

    router.push("/dashboard/landlord");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">List a property</h1>
      <p className="mt-2 text-sm text-foreground/70">
        This listing is saved as a draft. It won&apos;t appear on the site until you pay the
        ₦15,000 verification fee and RentDirect completes an in-person inspection and approves it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input name="title" placeholder="Title" required className={inputClass} />
        <textarea
          name="description"
          placeholder="Description"
          required
          minLength={20}
          rows={4}
          className={inputClass}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setListingType("rent")}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
              listingType === "rent"
                ? "border-transparent bg-clay text-white"
                : "border-line"
            }`}
          >
            For rent
          </button>
          <button
            type="button"
            onClick={() => setListingType("sale")}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
              listingType === "sale"
                ? "border-transparent bg-clay text-white"
                : "border-line"
            }`}
          >
            For sale
          </button>
        </div>

        <input name="propertyType" placeholder="Property type (e.g. Duplex, Flat)" required className={inputClass} />

        <div className="grid grid-cols-2 gap-4">
          <input
            name="priceNGN"
            type="number"
            min={0}
            placeholder={listingType === "rent" ? "Rent (₦/year)" : "Price (₦)"}
            required
            className={inputClass}
          />
          <input
            name="depositNGN"
            type="number"
            min={0}
            placeholder="Deposit (₦, optional)"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <input name="state" placeholder="State" required className={inputClass} />
          <input name="city" placeholder="City" required className={inputClass} />
          <input name="area" placeholder="Area (optional)" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
                furnishing === option
                  ? "border-transparent bg-clay text-white"
                  : "border-line"
              }`}
            >
              {option.replace("_", "-")}
            </button>
          ))}
        </div>

        <input name="amenities" placeholder="Amenities, comma separated (optional)" className={inputClass} />

        <div>
          <p className="mb-2 text-sm">Photos</p>
          <PhotoUploader value={photoUrls} onChange={setPhotoUrls} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-full bg-clay text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save as draft"}
        </button>
      </form>
    </div>
  );
}
