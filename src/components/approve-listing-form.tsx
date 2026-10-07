"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { SubmitButton } from "@/components/submit-button";
import { approveListing } from "@/app/dashboard/admin/actions";

// Approve & publish, with the option to add Reallow's own photos/videos on top of the
// landlord's and the field agent's — everything shown here goes live with the listing.
export function ApproveListingForm({
  listingId,
  photoUrls,
  videoUrls,
  disabled,
}: {
  listingId: string;
  photoUrls: string[];
  videoUrls: string[];
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [extraVideos, setExtraVideos] = useState<string[]>([]);
  const totalPhotos = photoUrls.length + extraPhotos.length;
  const totalVideos = videoUrls.length + extraVideos.length;

  return (
    <form action={approveListing} className="flex w-full flex-col gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      {extraPhotos.map((url) => (
        <input key={url} type="hidden" name="extraPhotoUrls" value={url} />
      ))}
      {extraVideos.map((url) => (
        <input key={url} type="hidden" name="extraVideoUrls" value={url} />
      ))}

      <div className="rounded-xl border border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            Goes live with {totalPhotos} photo{totalPhotos === 1 ? "" : "s"}
            {totalVideos > 0 && ` and ${totalVideos} video${totalVideos === 1 ? "" : "s"}`}
          </p>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="h-8 rounded-full border border-line px-3 text-xs font-medium hover:border-clay hover:text-clay"
            >
              + Add Reallow photos / videos
            </button>
          )}
        </div>
        {(photoUrls.length > 0 || extraPhotos.length > 0) && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {[...photoUrls, ...extraPhotos].map((url) => (
              <div key={url} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover" />
                {extraPhotos.includes(url) && (
                  <button
                    type="button"
                    onClick={() => setExtraPhotos((urls) => urls.filter((u) => u !== url))}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {adding && (
          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
            <div>
              <p className="text-xs text-foreground/60">Extra photos</p>
              <PhotoUploader value={extraPhotos} onChange={setExtraPhotos} />
            </div>
            <div>
              <p className="text-xs text-foreground/60">Extra videos</p>
              <VideoUploader value={extraVideos} onChange={setExtraVideos} />
            </div>
          </div>
        )}
      </div>

      <SubmitButton
        disabled={disabled}
        className="h-9 self-start rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-40"
      >
        Approve &amp; publish
      </SubmitButton>
    </form>
  );
}
