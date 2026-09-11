"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoLightbox } from "@/components/photo-lightbox";

export function PropertyPhotoHero({ photos, title }: { photos: string[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxIndex(0)}
        className="relative block aspect-video w-full overflow-hidden rounded-3xl"
        aria-label="Open photo"
      >
        <Image src={photos[0]} alt={title} fill priority className="object-cover" />
      </button>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          title={title}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

export function PropertyPhotoThumbnail({
  url,
  index,
  photos,
  title,
}: {
  url: string;
  index: number;
  photos: string[];
  title: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxIndex(index)}
        className="relative aspect-video overflow-hidden rounded-xl"
        aria-label="Open photo"
      >
        <Image src={url} alt={`${title} photo ${index + 1}`} fill className="object-cover" />
      </button>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          title={title}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
