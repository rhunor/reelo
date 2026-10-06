"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin bar across the top of the screen while a page is loading, so a tap on a link
// never looks like nothing happened. Starts on any click on an internal link (ignoring
// new-tab clicks, downloads and same-page hash links) and disappears as soon as the URL
// changes — it remembers which URL it started on, so no effect is needed to stop it.
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams.toString()}`;
  const [startedOn, setStartedOn] = useState<string | null>(null);
  const currentRef = useRef(currentUrl);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentRef.current = currentUrl;
  }, [currentUrl]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setStartedOn(currentRef.current);
      if (safety.current) clearTimeout(safety.current);
      // Never leave the bar stuck if a navigation is cancelled or fails.
      safety.current = setTimeout(() => setStartedOn(null), 15000);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The page changed: forget the start point (React's "adjust state during render"
  // pattern), so going Back to that URL later doesn't bring the bar back.
  if (startedOn !== null && startedOn !== currentUrl) {
    setStartedOn(null);
    return null;
  }
  if (startedOn === null) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" role="progressbar" aria-label="Loading page">
      <div className="h-full w-0 animate-[nav-progress_8s_cubic-bezier(0.1,0.7,0.2,1)_forwards] bg-clay shadow-[0_0_8px_var(--clay)]" />
    </div>
  );
}
