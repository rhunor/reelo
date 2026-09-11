"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 60;

interface PointerInfo {
  x: number;
  y: number;
}

export function PhotoLightbox({
  photos,
  title,
  index,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  title: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, PointerInfo>());
  const gesture = useRef<{
    mode: "none" | "pan" | "pinch" | "swipe";
    startDist?: number;
    startScale?: number;
    startTranslate?: { x: number; y: number };
    startMid?: PointerInfo;
    startX?: number;
    dragX?: number;
  }>({ mode: "none" });

  // Reset zoom/pan whenever the photo changes, so re-opening or swiping never carries over
  // a previous photo's zoom level.
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onIndexChange, onClose]);

  function clampTranslate(next: { x: number; y: number }, nextScale: number) {
    const el = containerRef.current;
    if (!el) return next;
    const maxX = (el.clientWidth * (nextScale - 1)) / 2;
    const maxY = (el.clientHeight * (nextScale - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function distanceBetween(a: PointerInfo, b: PointerInfo) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handlePointerDown(event: React.PointerEvent) {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        mode: "pinch",
        startDist: distanceBetween(a, b),
        startScale: scale,
        startTranslate: translate,
      };
    } else if (pointers.current.size === 1) {
      gesture.current =
        scale > 1
          ? { mode: "pan", startMid: { x: event.clientX, y: event.clientY }, startTranslate: translate }
          : { mode: "swipe", startX: event.clientX, dragX: 0 };
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const g = gesture.current;
    if (g.mode === "pinch" && pointers.current.size === 2 && g.startDist && g.startScale) {
      const [a, b] = [...pointers.current.values()];
      const dist = distanceBetween(a, b);
      const nextScale = Math.min(MAX_SCALE, Math.max(1, g.startScale * (dist / g.startDist)));
      setScale(nextScale);
      setTranslate((t) => clampTranslate(t, nextScale));
    } else if (g.mode === "pan" && g.startMid && g.startTranslate) {
      const dx = event.clientX - g.startMid.x;
      const dy = event.clientY - g.startMid.y;
      setTranslate(clampTranslate({ x: g.startTranslate.x + dx, y: g.startTranslate.y + dy }, scale));
    } else if (g.mode === "swipe" && g.startX !== undefined) {
      g.dragX = event.clientX - g.startX;
    }
  }

  function endGesture(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    const g = gesture.current;

    if (g.mode === "swipe" && g.dragX !== undefined) {
      if (g.dragX > SWIPE_THRESHOLD) onIndexChange((index - 1 + photos.length) % photos.length);
      else if (g.dragX < -SWIPE_THRESHOLD) onIndexChange((index + 1) % photos.length);
    }

    if (scale < 1.02) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }

    if (pointers.current.size === 0) gesture.current = { mode: "none" };
  }

  function toggleZoom(event: React.MouseEvent) {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
    event.stopPropagation();
  }

  function zoomBy(delta: number) {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(1, s + delta));
      if (next === 1) setTranslate({ x: 0, y: 0 });
      else setTranslate((t) => clampTranslate(t, next));
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo ${index + 1} of ${photos.length}`}
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
        <span>
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomBy(-0.5)}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-lg hover:bg-white/10"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.5)}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-lg hover:bg-white/10"
          >
            +
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 touch-none select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={toggleZoom}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- transform-driven zoom/pan needs a plain img, not next/image's fill layout */}
        <img
          src={photos[index]}
          alt={`${title} photo ${index + 1}`}
          draggable={false}
          className="absolute inset-0 m-auto h-full w-full object-contain"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: gesture.current.mode === "none" ? "transform 0.15s ease-out" : "none",
          }}
        />

        {photos.length > 1 && scale === 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange((index - 1 + photos.length) % photos.length);
              }}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange((index + 1) % photos.length);
              }}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
