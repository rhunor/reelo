"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HomePhoto } from "@/lib/home-photos";

const INTERVAL_MS = 4500;
const SWIPE_PX = 40;

// "Reallow is for everyone": a wide, auto-advancing photo of everyday Nigerian life — family
// homes, libraries, offices, land, building sites, church, a lounge, the market — with a strip
// of thumbnails underneath so the range is visible at a glance. No captions; the photos speak.
export function PeopleSlideshow({ photos }: { photos: HomePhoto[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const go = useCallback((next: number) => setIndex((next + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reduceMotion, go]);

  const photo = photos[index]!;

  return (
    <div
      className="flex flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Who Reallow is for"
    >
      {/* A fixed height (not just an aspect ratio) — iOS Safari collapses an aspect-ratio box
          whose children are all absolutely positioned, which hid the photos on phones. */}
      <div
        className="relative h-[22rem] overflow-hidden rounded-3xl bg-foreground/5 sm:h-[28rem] lg:h-[34rem]"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]!.clientX;
          setPaused(true);
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start === null) return;
          const delta = event.changedTouches[0]!.clientX - start;
          if (Math.abs(delta) > SWIPE_PX) go(index + (delta < 0 ? 1 : -1));
        }}
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
        <div className="absolute right-4 bottom-4 flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-black backdrop-blur hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-black backdrop-blur hover:bg-white"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose a photo">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={p.alt}
            onClick={() => go(i)}
            className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-all sm:h-16 sm:w-24 ${
              i === index ? "ring-2 ring-clay ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100"
            }`}
          >
            <Image src={p.src} alt="" fill sizes="96px" className="object-cover" style={{ objectPosition: p.position ?? "50% 50%" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
