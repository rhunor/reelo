"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HomePhoto } from "@/lib/home-photos";

const INTERVAL_MS = 4500;

// "Reallow is for everyone": a wide photo of everyday Nigerian life — family homes, libraries,
// offices, land, building sites, church, a lounge, the market — that changes on its own. There
// are deliberately no controls (no arrows, thumbnails or swiping); it just plays.
export function PeopleSlideshow({ photos }: { photos: HomePhoto[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % photos.length), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, reduceMotion, photos.length]);

  const photo = photos[index]!;

  return (
    // A fixed height (not just an aspect ratio) — iOS Safari collapses an aspect-ratio box
    // whose children are all absolutely positioned, which hid the photos on phones.
    <div
      className="relative h-[22rem] overflow-hidden rounded-3xl bg-foreground/5 sm:h-[28rem] lg:h-[34rem]"
      aria-roledescription="slideshow"
      aria-label="Who Reallow is for"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={photo.src}
          className="absolute inset-0"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 1152px) 1100px, 100vw"
            className="object-cover"
            style={{ objectPosition: photo.position ?? "50% 50%" }}
            priority={index === 0}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
