"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { addVerificationMedia } from "@/app/dashboard/staff/actions";

// Each upload is saved onto the listing the moment it finishes — no separate "save"
// step, since the point is that this media becomes the listing's own verification media.
export function StaffMediaUploader({ listingId }: { listingId: string }) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  async function handlePhotos(urls: string[]) {
    const added = urls.slice(photoUrls.length);
    setPhotoUrls(urls);
    if (added.length > 0) await addVerificationMedia(listingId, "photo", added);
  }

  async function handleVideos(urls: string[]) {
    const added = urls.slice(videoUrls.length);
    setVideoUrls(urls);
    if (added.length > 0) await addVerificationMedia(listingId, "video", added);
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div>
        <p className="text-xs text-foreground/60">Photos</p>
        <PhotoUploader value={photoUrls} onChange={handlePhotos} />
      </div>
      <div>
        <p className="text-xs text-foreground/60">Videos</p>
        <VideoUploader value={videoUrls} onChange={handleVideos} />
      </div>
    </div>
  );
}
