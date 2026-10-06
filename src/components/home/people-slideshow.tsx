"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HomePhoto } from "@/lib/home-photos";

const INTERVAL_MS = 5500;
const SWIPE_PX = 40;

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

  const dots = (
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
  );

  return (
    <div
      className="grid gap-6 lg:grid-cols-[1.35fr_1fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Who Reallow is for"
    >
      {/* Photo. A fixed height (not just an aspect ratio) — iOS Safari collapses an
          aspect-ratio box whose children are all absolutely positioned inside a grid,
          which is why the photos weren't showing on phones. */}
      <div
        className="relative h-[26rem] overflow-hidden rounded-3xl bg-foreground/5 sm:h-[28rem] lg:h-[30rem]"
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
              sizes="(min-width: 1024px) 700px, 100vw"
              className="object-cover"
              style={{ objectPosition: photo.position ?? "50% 50%" }}
              priority={index === 0}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 pr-24 sm:p-6 sm:pr-28">
              <p className="font-mono text-[11px] tracking-widest text-white/70 uppercase">
                {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-white drop-shadow sm:text-3xl">{photo.caption}</p>
              {/* On phones the description sits on the photo — one card instead of two. */}
              <p className="mt-1.5 text-sm leading-relaxed text-white/85 lg:hidden">{photo.detail}</p>
            </div>
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

      <div className="flex justify-center lg:hidden">{dots}</div>

      {/* Desktop: description panel beside the photo. */}
      <div className="hidden flex-col justify-between gap-6 rounded-3xl border border-line bg-surface p-8 lg:flex">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={photo.caption}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <h3 className="text-2xl font-semibold tracking-tight">{photo.caption}</h3>
            <p className="mt-3 leading-relaxed text-foreground/70">{photo.detail}</p>
          </motion.div>
        </AnimatePresence>
        {dots}
      </div>
    </div>
  );
}
