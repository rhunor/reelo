"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayChoice } from "@/components/pay-choice";
import { MeetingFeedbackForm } from "@/components/dashboard/meeting-feedback-form";
import { LAGOS_TIME_ZONE, toLagosDateTimeLocal } from "@/lib/time";
import type { BookableApplication, CalendarEvent } from "@/lib/dashboard-data";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { TranslateVars } from "@/lib/i18n/interpolate";

type T = (key: MessageKey, vars?: TranslateVars) => string;

// Dates follow the chosen language where the browser has it (Yorùbá, Hausa, Igbo, Pidgin
// are in CLDR); anything else falls back to Nigerian English.
const dateLocale = (locale: string) => (locale === "en" || locale === "urh" ? "en-NG" : `${locale}-NG`);

// Reallow only operates in Nigeria (WAT, no DST), so every calendar day is a Lagos day.
const dayKey = (date: Date | string) => toLagosDateTimeLocal(new Date(date)).slice(0, 10);
const timeOf = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(dateLocale(locale), { timeZone: LAGOS_TIME_ZONE, hour: "numeric", minute: "2-digit" });
const longDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(dateLocale(locale), {
    timeZone: LAGOS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const keyToLabel = (key: string, locale: string) =>
  new Date(`${key}T12:00:00+01:00`).toLocaleDateString(dateLocale(locale), {
    timeZone: LAGOS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
// Mon–Sun, from a known Monday.
const weekdays = (locale: string) =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i, 12)).toLocaleDateString(dateLocale(locale), { weekday: "short", timeZone: "UTC" }),
  );

function isHeld(event: CalendarEvent) {
  return (event.status === "confirmed" || event.status === "completed") && new Date(event.at).getTime() < Date.now();
}

function headline(event: CalendarEvent, t: T): string {
  const title = `“${event.listingTitle}”`;
  if (isHeld(event)) {
    if (event.kind === "verification") return t("meetings.h.verified", { title });
    if (event.kind === "inspection") return t(event.side === "landlord" ? "meetings.h.wasInspected" : "meetings.h.youInspected", { title });
    return t(event.side === "landlord" ? "meetings.h.metApplicant" : "meetings.h.metLandlord", { title });
  }
  if (event.kind === "verification") return t("meetings.h.verificationVisit", { title: event.listingTitle });
  if (event.kind === "inspection") return t("meetings.h.inspection", { title: event.listingTitle });
  return t(event.side === "landlord" ? "meetings.h.meetingApplicant" : "meetings.h.meetingLandlord", { title: event.listingTitle });
}

function statusBadge(event: CalendarEvent, t: T): { label: string; className: string } {
  const amber = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  const green = "bg-verified/10 text-verified";
  const grey = "bg-foreground/5 text-foreground/60";
  const red = "bg-red-500/10 text-red-600";
  if (event.status === "pending")
    return { label: t(event.myTurn ? "meetings.s.yourResponse" : "meetings.s.pending"), className: amber };
  if (event.status === "declined") return { label: t("meetings.s.declined"), className: red };
  if (event.status === "cancelled") return { label: t("meetings.s.cancelled"), className: grey };
  if (isHeld(event)) return { label: t(event.status === "completed" ? "meetings.s.completed" : "meetings.s.held"), className: grey };
  if (event.kind === "inspection" && event.source === "meeting" && !event.paid)
    return { label: t("meetings.s.feeUnpaid"), className: amber };
  return { label: t("meetings.s.confirmed"), className: green };
}

function dotClass(event: CalendarEvent) {
  if (event.status === "declined" || event.status === "cancelled") return "bg-red-400";
  if (isHeld(event)) return "bg-foreground/30";
  if (event.status === "pending" || (event.kind === "inspection" && event.source === "meeting" && !event.paid))
    return "bg-amber-500";
  return "bg-verified";
}

export function EventCard({ event, walletBalanceNGN }: { event: CalendarEvent; walletBalanceNGN: number }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [counterTime, setCounterTime] = useState("");
  const [rating, setRating] = useState(false);
  const badge = statusBadge(event, t);

  async function respond(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/meetings/${event.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? t("meetings.respondFailed"));
      return;
    }
    setCountering(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{headline(event, t)}</p>
          <p className="mt-0.5 text-xs text-foreground/60">
            {longDate(event.at, locale)} · {timeOf(event.at, locale)}
            {event.kind === "inspection" && ` · ${t("meetings.withAgent")}`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {event.status === "pending" && !event.myTurn && event.source === "meeting" && (
        <p className="mt-2 text-xs text-foreground/50">{t("meetings.waitingOtherSide")}</p>
      )}

      {event.source === "meeting" && event.myTurn && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => respond({ action: "accept" })}
              className="h-8 rounded-full bg-clay px-3.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {t("meetings.accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond({ action: "decline" })}
              className="h-8 rounded-full border border-line px-3.5 text-xs font-medium disabled:opacity-50"
            >
              {t("meetings.decline")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCountering((v) => !v)}
              className="h-8 rounded-full border border-line px-3.5 text-xs font-medium disabled:opacity-50"
            >
              {t("meetings.suggestAnother")}
            </button>
          </div>
          {countering && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={counterTime}
                min={toLagosDateTimeLocal(new Date())}
                onChange={(e) => setCounterTime(e.target.value)}
                className="h-9 rounded-md border border-line bg-transparent px-2 text-sm"
              />
              <button
                type="button"
                disabled={busy || !counterTime}
                onClick={() => respond({ action: "counter", proposedTime: counterTime })}
                className="h-9 rounded-full bg-clay px-4 text-xs font-medium text-white disabled:opacity-50"
              >
                {t("common.send")}
              </button>
            </div>
          )}
        </div>
      )}

      {event.verificationHref && (
        <Link
          href={event.verificationHref}
          className="mt-3 inline-flex h-8 items-center rounded-full bg-clay px-3.5 text-xs font-medium text-white"
        >
          {t("meetings.confirmOrChange")}
        </Link>
      )}

      {event.payAmountNGN !== undefined && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-foreground/60">
            {t("meetings.payHint")}
          </p>
          <PayChoice
            endpoint={`/api/meetings/${event.id}/pay`}
            amountNGN={event.payAmountNGN}
            walletBalanceNGN={walletBalanceNGN}
            label={t("meetings.payFee", { amount: `₦${event.payAmountNGN.toLocaleString()}` })}
          />
        </div>
      )}

      {event.canLeaveFeedback &&
        (rating ? (
          <MeetingFeedbackForm targetType={event.source} targetId={event.id} side={event.side} onCancel={() => setRating(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setRating(true)}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
          >
            ★ {t(event.kind === "meeting" ? "meetings.rateMeeting" : "meetings.rateVisit")}
          </button>
        ))}
      {event.feedbackGiven && <p className="mt-2 text-xs text-foreground/50">{t("meetings.feedbackThanks")}</p>}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function MeetingsCalendar({
  events,
  bookable,
  walletBalanceNGN,
  initialTicketId,
}: {
  events: CalendarEvent[];
  bookable: BookableApplication[];
  walletBalanceNGN: number;
  initialTicketId?: string;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const todayKey = dayKey(new Date());
  const [month, setMonth] = useState(() => todayKey.slice(0, 7)); // "YYYY-MM"
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const preselected = bookable.find((b) => b.ticketId === initialTicketId);
  const [booking, setBooking] = useState(Boolean(preselected));
  const [ticketId, setTicketId] = useState(preselected?.ticketId ?? bookable[0]?.ticketId ?? "");
  const [time, setTime] = useState("10:00");
  const [sending, setSending] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSent, setBookSent] = useState(false);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(event.at);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  // Fixed for this render pass; the page refreshes after every action anyway.
  const [now] = useState(() => Date.now());
  const upcoming = events.filter(
    (e) => new Date(e.at).getTime() >= now && (e.status === "pending" || e.status === "confirmed"),
  );
  const history = events.filter(isHeld).reverse();
  const next = upcoming[0];
  const needsAction = events.filter((e) => e.myTurn || e.payAmountNGN !== undefined || e.canLeaveFeedback);

  // Monday-first month grid, always 6 weeks so the window doesn't jump in height.
  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y!, m! - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(Date.UTC(y!, m! - 1, 1 - offset + i));
      return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === m! - 1 };
    });
  }, [month]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(Date.UTC(y!, m! - 1 + delta, 1));
    setMonth(date.toISOString().slice(0, 7));
  }

  const monthLabel = new Date(`${month}-15T12:00:00Z`).toLocaleDateString(dateLocale(locale), { month: "long", year: "numeric" });
  const dayEvents = eventsByDay.get(selectedDay) ?? [];

  async function sendRequest() {
    setBookError(null);
    if (!ticketId) return setBookError(t("meetings.chooseApplication"));
    if (selectedDay < todayKey) return setBookError(t("meetings.pickFutureDay"));
    setSending(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only meetings are booked here: a listing is already inspected by Reallow before it
      // goes live, so a separate paid inspection would be redundant.
      body: JSON.stringify({ ticketId, kind: "meeting", proposedTime: `${selectedDay}T${time}` }),
    });
    const data = await res.json().catch(() => null);
    setSending(false);
    if (!res.ok) return setBookError(data?.error ?? t("meetings.requestFailed"));
    setBookSent(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* What's next */}
      <div className={`rounded-xl p-4 ${next ? "bg-clay/10" : "bg-foreground/5"}`}>
        {next ? (
          <>
            <p className="text-xs font-medium tracking-wide text-clay uppercase">{t("meetings.upNext")}</p>
            <p className="mt-1 text-sm font-medium">{headline(next, t)}</p>
            <p className="mt-0.5 text-xs text-foreground/60">
              {longDate(next.at, locale)} · {timeOf(next.at, locale)} · {statusBadge(next, t).label}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium">{t("meetings.noUpcoming")}</p>
        )}
        {upcoming.length > 1 && (
          <p className="mt-2 text-xs text-foreground/50">{t("meetings.moreUpcoming", { count: upcoming.length - 1 })}</p>
        )}
      </div>

      {needsAction.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">{t("meetings.needsAttention")}</p>
          <div className="flex flex-col gap-2">
            {needsAction.map((event) => (
              <EventCard key={`${event.source}-${event.id}`} event={event} walletBalanceNGN={walletBalanceNGN} />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">{t("meetings.history")}</p>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {(showAllHistory ? history : history.slice(0, 3)).map((event) => (
              <li key={`${event.source}-${event.id}`} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-xs text-foreground/50">{longDate(event.at, locale)}</span>
                <span className="min-w-0">{headline(event, t)}</span>
              </li>
            ))}
          </ul>
          {history.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllHistory((v) => !v)}
              className="mt-1.5 text-xs text-clay hover:underline"
            >
              {showAllHistory ? t("common.showLess") : t("common.showAll", { count: history.length })}
            </button>
          )}
        </div>
      )}

      {/* Book */}
      {bookable.length > 0 && !booking && (
        <button
          type="button"
          onClick={() => {
            setBooking(true);
            setBookSent(false);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-dashed border-clay/60 text-sm font-medium text-clay hover:bg-clay/5"
        >
          + {t("meetings.bookCta")}
        </button>
      )}

      {booking && (
        <div className="rounded-xl border border-clay/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("meetings.bookCta")}</p>
            <button type="button" onClick={() => setBooking(false)} className="text-xs text-foreground/50 hover:text-foreground">
              {t("common.close")}
            </button>
          </div>
          {bookSent ? (
            <p className="mt-3 text-sm text-verified">
              {t("meetings.requestSent")}
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-foreground/60">
                {t("meetings.application")}
                <select
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="h-10 rounded-md border border-line bg-transparent px-2 text-sm text-foreground"
                >
                  {bookable.map((b) => (
                    <option key={b.ticketId} value={b.ticketId}>
                      {b.listingTitle} — {t(b.side === "landlord" ? "meetings.applicantYouAccepted" : "meetings.yourAcceptedApplication")}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-foreground/50">{t("meetings.meetingHint")}</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1 text-xs text-foreground/60">
                  {t("meetings.day")}
                  <span className="flex h-10 items-center rounded-md border border-line px-3 text-sm text-foreground">
                    {keyToLabel(selectedDay, locale)}
                  </span>
                </div>
                <label className="flex flex-col gap-1 text-xs text-foreground/60">
                  {t("meetings.time")}
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-10 rounded-md border border-line bg-transparent px-2 text-sm text-foreground"
                  />
                </label>
                <button
                  type="button"
                  disabled={sending}
                  onClick={sendRequest}
                  className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {sending ? t("common.sending") : t("meetings.sendRequest")}
                </button>
              </div>
              <p className="text-xs text-foreground/50">{t("meetings.tapDay")}</p>
              {bookError && <p className="text-sm text-red-600">{bookError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-line p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label={t("meetings.prevMonth")}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/5"
          >
            ‹
          </button>
          <p className="text-sm font-semibold">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label={t("meetings.nextMonth")}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/5"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-foreground/40">
          {weekdays(locale).map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayEventsForCell = eventsByDay.get(cell.key) ?? [];
            const isSelected = cell.key === selectedDay;
            const isToday = cell.key === todayKey;
            const isPastDay = cell.key < todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDay(cell.key)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors sm:aspect-auto sm:h-14 ${
                  isSelected
                    ? "bg-clay text-white"
                    : isToday
                      ? "bg-clay/10 font-semibold text-clay"
                      : "hover:bg-foreground/5"
                } ${cell.inMonth ? "" : "opacity-35"} ${isPastDay && !isSelected ? "text-foreground/50" : ""}`}
              >
                {cell.day}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {dayEventsForCell.slice(0, 3).map((event) => (
                    <span
                      key={`${event.source}-${event.id}`}
                      className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : dotClass(event)}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground/50">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-verified" /> {t("meetings.legendConfirmed")}</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t("meetings.s.pending")}</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-foreground/30" /> {t("meetings.legendPast")}</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> {t("meetings.s.declined")}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{keyToLabel(selectedDay, locale)}</p>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-foreground/50">{t("meetings.nothingThisDay")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dayEvents.map((event) => (
              <EventCard key={`${event.source}-${event.id}`} event={event} walletBalanceNGN={walletBalanceNGN} />
            ))}
          </div>
        )}
      </div>

      {events.length === 0 && bookable.length === 0 && (
        <p className="text-center text-xs text-foreground/50">
          {t("meetings.emptyHint")}
        </p>
      )}
    </div>
  );
}
