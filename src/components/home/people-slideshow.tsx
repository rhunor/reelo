"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HomePhoto } from "@/lib/home-photos";

const INTERVAL_MS = 5500;

export function PeopleSlideshow({ photos }: { photos: HomePhoto[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((next: number) => setIndex((next + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reduceMotion, go]);

  const photo = photos[index]!;

  return (
    <div
      className="grid items-stretch gap-6 lg:grid-cols-[1.35fr_1fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Who Reallow is for"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-foreground/5 sm:aspect-[16/10]">
        <AnimatePresence initial={false} mode="popLayout">
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
              sizes="(min-width: 1024px) 700px, 100vw"
              className="object-cover"
              style={{ objectPosition: photo.position ?? "50% 50%" }}
              priority={index === 0}
            />
            {/* Inside the keyed layer so the caption always fades with its own photo. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
            <p className="absolute bottom-5 left-5 pr-28 font-display text-2xl font-semibold text-white drop-shadow sm:text-3xl">
              {photo.caption}
            </p>
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

      <div className="flex flex-col justify-between gap-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={photo.caption}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="font-mono text-xs tracking-widest text-clay uppercase">
                {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">{photo.caption}</h3>
              <p className="mt-3 leading-relaxed text-foreground/70">{photo.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a photo">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={p.caption}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-clay" : "w-2 bg-foreground/20 hover:bg-foreground/40"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
