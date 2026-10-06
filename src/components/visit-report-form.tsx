"use client";

import { useActionState, useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { submitVisitReport, type VisitReportFormState } from "@/app/dashboard/staff/actions";
import type { VisitReport } from "@/types/models";

const CONDITION_OPTIONS: { value: VisitReport["condition"]; label: string; hint: string }[] = [
  { value: "matches", label: "Matches the listing", hint: "Everything is as described" },
  { value: "minor_differences", label: "Minor differences", hint: "Small things to correct" },
  { value: "does_not_match", label: "Doesn't match", hint: "Recommend rejecting" },
];

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// Everything the field agent captures at a verification visit, in one form: how the
// property compares with the listing, a star rating and comment, photos/videos of the
// property, and photos/videos of the road leading to it.
export function VisitReportForm({
  listingId,
  existing,
}: {
  listingId: string;
  existing?: Partial<
    Pick<VisitReport, "condition" | "rating" | "comments" | "narration" | "photoUrls" | "videoUrls" | "roadPhotoUrls" | "roadVideoUrls">
  >;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>(existing?.photoUrls ?? []);
  const [videoUrls, setVideoUrls] = useState<string[]>(existing?.videoUrls ?? []);
  const [roadPhotoUrls, setRoadPhotoUrls] = useState<string[]>(existing?.roadPhotoUrls ?? []);
  const [roadVideoUrls, setRoadVideoUrls] = useState<string[]>(existing?.roadVideoUrls ?? []);
  const [state, formAction, pending] = useActionState<VisitReportFormState, FormData>(submitVisitReport, {
    status: "idle",
  });
  const shown = hover || rating;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="rating" value={rating || ""} />
      {photoUrls.map((url) => (
        <input key={url} type="hidden" name="photoUrls" value={url} />
      ))}
      {videoUrls.map((url) => (
        <input key={url} type="hidden" name="videoUrls" value={url} />
      ))}
      {roadPhotoUrls.map((url) => (
        <input key={url} type="hidden" name="roadPhotoUrls" value={url} />
      ))}
      {roadVideoUrls.map((url) => (
        <input key={url} type="hidden" name="roadVideoUrls" value={url} />
      ))}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">How does the property compare with the listing?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CONDITION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer flex-col rounded-xl border border-line p-3 text-sm has-[:checked]:border-clay has-[:checked]:bg-clay/5"
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="condition"
                  value={option.value}
                  defaultChecked={existing?.condition === option.value}
                  required
                />
                {option.label}
              </span>
              <span className="mt-0.5 pl-5 text-xs text-foreground/50">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="mb-1 text-sm font-medium">Rate the visit</p>
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
        <span className="font-medium">Comment</span>
        <span className="text-xs text-foreground/50">
          How the visit went, concerns, things the landlord should fix, or anything admin should know.
        </span>
        <textarea
          name="comments"
          maxLength={2000}
          rows={3}
          defaultValue={existing?.comments}
          className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <MediaSection
        title="The property"
        hint="Opens your camera on a phone. Take the outside, every room, the kitchen and toilets."
        photos={photoUrls}
        onPhotos={setPhotoUrls}
        videos={videoUrls}
        onVideos={setVideoUrls}
      />

      <MediaSection
        title="The road to the property"
        hint="The street it's on and the way in from the nearest main road or landmark — so tenants know what the access is like."
        photos={roadPhotoUrls}
        onPhotos={setRoadPhotoUrls}
        videos={roadVideoUrls}
        onVideos={setRoadVideoUrls}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Narration (optional)</span>
        <span className="text-xs text-foreground/50">
          Walk us through the property: the building, each room, water and power, the area.
        </span>
        <textarea
          name="narration"
          maxLength={8000}
          rows={4}
          defaultValue={existing?.narration}
          className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : existing?.condition ? "Update report" : "Submit visit report"}
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

function MediaSection({
  title,
  hint,
  photos,
  onPhotos,
  videos,
  onVideos,
}: {
  title: string;
  hint: string;
  photos: string[];
  onPhotos: (urls: string[]) => void;
  videos: string[];
  onVideos: (urls: string[]) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mb-2 text-xs text-foreground/50">{hint}</p>
      <p className="text-xs text-foreground/60">Photos (at least one)</p>
      <PhotoUploader value={photos} onChange={onPhotos} capture="environment" />
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
              <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onPhotos(photos.filter((u) => u !== url))}
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-foreground/60">Video (optional)</p>
      <VideoUploader value={videos} onChange={onVideos} />
    </div>
  );
}
