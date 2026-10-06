"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useClickOutside } from "@/components/use-click-outside";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/i18n-provider";

export function ProfileMenu({
  name,
  email,
  pictureUrl,
  dashboardHref,
  listPropertyHref,
  logout,
}: {
  name: string;
  email: string;
  pictureUrl?: string;
  dashboardHref: string;
  // Only for ordinary accounts — staff can't list properties.
  listPropertyHref?: string;
  logout: () => Promise<void>;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const itemClass = "flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-foreground/5";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex rounded-full ring-offset-2 ring-offset-background hover:ring-2 hover:ring-clay/50"
      >
        <UserAvatar name={name} pictureUrl={pictureUrl} size={36} />
      </button>

      {open && (
        <div className="absolute top-11 right-0 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <UserAvatar name={name} pictureUrl={pictureUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-foreground/50">{email}</p>
            </div>
          </div>
          <div className="py-1">
            <Link href={dashboardHref} onClick={close} className={itemClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-foreground/60">
                <path strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
              </svg>
              {t("nav.dashboard")}
            </Link>
            {listPropertyHref && (
              <Link href={listPropertyHref} onClick={close} className={itemClass}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-foreground/60">
                  <path strokeLinejoin="round" d="M3 11l9-7 9 7v10H3V11Z" />
                  <path strokeLinecap="round" d="M12 12v6M9 15h6" />
                </svg>
                {t("nav.listProperty")}
              </Link>
            )}
            <Link href="/dashboard/settings" onClick={close} className={itemClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-foreground/60">
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </svg>
              {t("menu.settings")}
            </Link>
          </div>
          <form action={logout} className="border-t border-line py-1">
            <button type="submit" className={`${itemClass} w-full text-left text-red-600`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {t("menu.logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
