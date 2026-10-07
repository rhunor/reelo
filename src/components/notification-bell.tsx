"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClickOutside } from "@/components/use-click-outside";
import { useI18n } from "@/components/i18n-provider";

type Item = { id: string; title: string; body: string; href: string; read: boolean; createdAt: string };

function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// How often the bell checks for new notifications while the tab is visible.
const POLL_MS = 10_000;

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const newestRef = useRef<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) throw new Error();
    return res.json();
  }, []);

  // Live updates: poll the cheap unread count while the tab is visible (and straight away
  // when the person comes back to the tab). When something new arrives, update the badge,
  // the open dropdown, and the page itself — so a new application, meeting request or
  // reply shows up without a refresh.
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications?count=1", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data: { unreadCount: number; newestAt: string | null } = await res.json();
        const isNew = newestRef.current !== null && data.newestAt !== null && data.newestAt !== newestRef.current;
        newestRef.current = data.newestAt ?? "";
        setUnread(data.unreadCount);
        if (isNew) {
          router.refresh();
          if (open) setItems((await loadItems()).notifications);
        }
      } catch {
        // Offline or a blip — try again next tick.
      }
    }
    void check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [open, router, loadItems]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    try {
      const data = await loadItems();
      // Keep the unread highlight for this viewing, then mark everything read.
      setItems(data.notifications);
      if (data.unreadCount > 0) {
        setUnread(0);
        void fetch("/api/notifications", { method: "POST" });
      }
    } catch {
      setItems([]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-foreground/70 hover:border-clay hover:text-clay"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Zm4.3 13a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:top-11 sm:right-0 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">{t("notif.title")}</p>
            <Link href="/dashboard/notifications" onClick={close} className="text-xs text-clay hover:underline">
              {t("notif.seeAll")}
            </Link>
          </div>
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {items === null && <p className="px-4 py-6 text-center text-sm text-foreground/50">Loading…</p>}
            {items?.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-foreground/50">{t("notif.empty")}</p>
            )}
            {items?.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={close}
                className={`flex gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-foreground/5 ${
                  item.read ? "" : "bg-clay/5"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-clay"}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-foreground/60">{item.body}</span>
                  <span className="mt-1 block text-[11px] text-foreground/40">{timeAgo(item.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
