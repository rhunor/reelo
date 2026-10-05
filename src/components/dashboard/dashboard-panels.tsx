"use client";

import { useEffect, useState, type ReactNode } from "react";
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
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
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

const ICONS: Record<Panel, ReactNode> = {
  meetings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
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

  // Keep the open window in the URL (so a notification can deep-link into it) without a
  // navigation — the window opens over the dashboard, never on a separate page.
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
      <div className={`grid gap-2 sm:gap-3 ${tiles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {tiles.map((tile) => (
          <button
            key={tile.panel}
            type="button"
            onClick={() => open(tile.panel)}
            className="group relative flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-all hover:-translate-y-0.5 hover:border-clay/50 hover:shadow-md sm:p-5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay/10 text-clay">
              {ICONS[tile.panel]}
            </span>
            <span>
              <span className="block text-sm font-semibold sm:text-base">{t(PANEL_TITLE[tile.panel])}</span>
              <span className="mt-0.5 block text-[11px] text-foreground/50 sm:text-xs">{tile.caption}</span>
            </span>
            {tile.badge && (
              <span className="absolute top-3 right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1.5 text-[11px] font-semibold text-white">
                {tile.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {panel && (
        <Modal title={t(PANEL_TITLE[panel])} onClose={() => open(null)}>
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
        </Modal>
      )}
    </>
  );
}
