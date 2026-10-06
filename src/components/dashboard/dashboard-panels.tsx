"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MeetingsCalendar } from "@/components/dashboard/meetings-calendar";
import { TransactionsPanel } from "@/components/dashboard/transactions-panel";
import { WalletPanel } from "@/components/wallet-panel";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type {
  BookableApplication,
  CalendarEvent,
  LedgerEntry,
  WalletEarning,
  WalletWithdrawal,
} from "@/lib/dashboard-data";

export type Panel = "meetings" | "transactions" | "wallet";

const PANEL_TITLE: Record<Panel, MessageKey> = {
  meetings: "dash.meetings",
  transactions: "dash.transactions",
  wallet: "dash.wallet",
};

// Opens in place, directly under the row of buttons — no overlay, no blurred page.
function InlinePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Bring it into view if it opened below the fold (e.g. from a notification link).
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.top > window.innerHeight * 0.8) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      role="region"
      aria-label={title}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mt-3 scroll-mt-24 rounded-3xl border border-clay/30 bg-surface shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-foreground/5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="px-4 py-5 sm:px-5">{children}</div>
    </motion.div>
  );
}

const ICONS: Record<Panel, ReactNode> = {
  meetings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h13v4" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" />
    </svg>
  ),
};

export function DashboardPanels({
  initialPanel,
  initialTicketId,
  initialKind,
  events,
  bookable,
  ledger,
  walletBalanceNGN,
  referralCode,
  earnings,
  withdrawals,
  hasBankDetails,
  panels = ["meetings", "transactions", "wallet"],
}: {
  panels?: Panel[];
  initialPanel?: Panel;
  initialTicketId?: string;
  initialKind?: "inspection" | "meeting";
  events: CalendarEvent[];
  bookable: BookableApplication[];
  ledger: LedgerEntry[];
  walletBalanceNGN: number;
  referralCode?: string;
  earnings: WalletEarning[];
  withdrawals: WalletWithdrawal[];
  hasBankDetails: boolean;
}) {
  const { t } = useI18n();
  const [panel, setPanel] = useState<Panel | null>(
    initialPanel && panels.includes(initialPanel) ? initialPanel : null,
  );

  // Keep the open panel in the URL (so a notification can deep-link into it) without a
  // navigation — it opens in place on the dashboard, never on a separate page.
  function open(next: Panel | null) {
    setPanel(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("panel", next);
    else {
      url.searchParams.delete("panel");
      url.searchParams.delete("ticket");
      url.searchParams.delete("kind");
    }
    window.history.replaceState(null, "", url);
  }

  const close = useCallback(() => open(null), []);

  // Fixed for this render pass; the page refreshes after every action anyway.
  const [now] = useState(() => Date.now());
  const actionCount = events.filter((e) => e.myTurn || e.payAmountNGN !== undefined).length;
  const upcomingCount = events.filter(
    (e) => new Date(e.at).getTime() >= now && (e.status === "pending" || e.status === "confirmed"),
  ).length;

  const allTiles: { panel: Panel; caption: string; badge?: number }[] = [
    {
      panel: "meetings",
      caption: upcomingCount ? `${upcomingCount} upcoming` : "No upcoming meetings",
      badge: actionCount || undefined,
    },
    { panel: "transactions", caption: `${ledger.length} record${ledger.length === 1 ? "" : "s"}` },
    { panel: "wallet", caption: `₦${walletBalanceNGN.toLocaleString()}` },
  ];
  const tiles = allTiles.filter((tile) => panels.includes(tile.panel));

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your account">
        {tiles.map((tile) => {
          const active = panel === tile.panel;
          return (
            <button
              key={tile.panel}
              type="button"
              role="tab"
              aria-selected={active}
              aria-expanded={active}
              onClick={() => open(active ? null : tile.panel)}
              title={tile.caption}
              className={`relative flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                active
                  ? "border-transparent bg-clay text-white shadow-sm"
                  : "border-line hover:border-clay hover:text-clay"
              }`}
            >
              {ICONS[tile.panel]}
              {t(PANEL_TITLE[tile.panel])}
              {tile.panel === "wallet" && (
                <span className={`font-mono text-xs ${active ? "text-white/80" : "text-foreground/50"}`}>{tile.caption}</span>
              )}
              {tile.badge && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                    active ? "bg-white text-clay" : "bg-clay text-white"
                  }`}
                >
                  {tile.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {panel && (
        <InlinePanel title={t(PANEL_TITLE[panel])} onClose={close}>
          {panel === "meetings" && (
            <MeetingsCalendar
              events={events}
              bookable={bookable}
              walletBalanceNGN={walletBalanceNGN}
              initialTicketId={initialTicketId}
              initialKind={initialKind}
            />
          )}
          {panel === "transactions" && <TransactionsPanel entries={ledger} />}
          {panel === "wallet" && (
            <WalletPanel
              walletBalanceNGN={walletBalanceNGN}
              referralCode={referralCode}
              earnings={earnings}
              withdrawals={withdrawals}
              hasBankDetails={hasBankDetails}
            />
          )}
        </InlinePanel>
      )}
    </>
  );
}
