"use client";

import { useActionState, useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { submitInspectionReport, type InspectionReportFormState } from "@/app/dashboard/staff/actions";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// The field agent's report on a tenant inspection: a star rating, notes and supporting
// photos. Collapsed to one button until opened; shows "filed" once saved, and can be edited.
export function InspectionReportForm({
  targetType,
  targetId,
  existing,
}: {
  targetType: "meeting" | "inspection_booking";
  targetId: string;
  existing?: { rating: number; comment?: string; photoUrls?: string[] };
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>(existing?.photoUrls ?? []);
  const [state, formAction, pending] = useActionState<InspectionReportFormState, FormData>(submitInspectionReport, {
    status: "idle",
  });
  const filed = Boolean(existing) || state.status === "success";
  const shown = hover || rating;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {filed && <span className="text-xs text-verified">✓ Report filed</span>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
        >
          {filed ? "Edit report" : "＋ Add photos, notes & rating"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4 rounded-xl border border-line p-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="rating" value={rating || ""} />
      {photoUrls.map((url) => (
        <input key={url} type="hidden" name="photoUrls" value={url} />
      ))}

      <div>
        <p className="mb-1 text-sm font-medium">Rate the property / inspection</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              className={`text-3xl leading-none transition-colors ${value <= shown ? "text-amber-400" : "text-foreground/15"}`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-foreground/60">{shown ? STAR_LABELS[shown] : "Tap to rate"}</span>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Notes</span>
        <span className="text-xs text-foreground/50">
          The state of the property, anything that differs from the listing, how the tenant and landlord got on, late or
          no-show, concerns.
        </span>
        <textarea
          name="notes"
          maxLength={2000}
          rows={4}
          defaultValue={existing?.comment}
          className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <div>
        <p className="text-sm font-medium">Supporting photos (at least one)</p>
        <p className="mb-2 text-xs text-foreground/50">Opens your camera on a phone.</p>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} capture="environment" />
        {photoUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photoUrls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrls(photoUrls.filter((u) => u !== url))}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : filed ? "Update report" : "Save report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-foreground/60 hover:text-clay">
          Close
        </button>
        {state.status !== "idle" && (
          <p role="status" className={`text-sm ${state.status === "success" ? "text-verified" : "text-red-600"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
