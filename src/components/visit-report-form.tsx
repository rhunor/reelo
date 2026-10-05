"use client";

import { useActionState, useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { submitVisitReport, type VisitReportFormState } from "@/app/dashboard/staff/actions";
import type { VisitReport } from "@/types/models";

const CONDITION_OPTIONS: { value: VisitReport["condition"]; label: string; hint: string }[] = [
  { value: "matches", label: "Matches the listing", hint: "Everything is as described" },
  { value: "minor_differences", label: "Minor differences", hint: "Small things to correct" },
  { value: "does_not_match", label: "Doesn't match", hint: "Recommend rejecting" },
];

export function VisitReportForm({
  listingId,
  existing,
}: {
  listingId: string;
  existing?: Pick<VisitReport, "condition" | "comments" | "narration" | "photoUrls">;
}) {
  const [photoUrls, setPhotoUrls] = useState<string[]>(existing?.photoUrls ?? []);
  const [state, formAction, pending] = useActionState<VisitReportFormState, FormData>(submitVisitReport, {
    status: "idle",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      {photoUrls.map((url) => (
        <input key={url} type="hidden" name="photoUrls" value={url} />
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
        <p className="mb-1 text-sm font-medium">Photos from the visit</p>
        <p className="mb-2 text-xs text-foreground/50">
          Opens your camera on a phone. Take the outside, every room, the kitchen and toilets, and the road in.
        </p>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} capture="environment" />
        {photoUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photoUrls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrls((urls) => urls.filter((u) => u !== url))}
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

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Narration</span>
        <span className="text-xs text-foreground/50">
          Walk us through the property: the approach and road, the building, each room, water and power, the area.
        </span>
        <textarea
          name="narration"
          required
          minLength={20}
          maxLength={8000}
          rows={6}
          defaultValue={existing?.narration}
          className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Additional comments (optional)</span>
        <span className="text-xs text-foreground/50">Concerns, things the landlord should fix, or anything admin should know.</span>
        <textarea
          name="comments"
          maxLength={2000}
          rows={3}
          defaultValue={existing?.comments}
          className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : existing ? "Update report" : "Submit visit report"}
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
