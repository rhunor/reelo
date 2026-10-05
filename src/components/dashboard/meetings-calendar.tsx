"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayChoice } from "@/components/pay-choice";
import { MeetingFeedbackForm } from "@/components/dashboard/meeting-feedback-form";
import { LAGOS_TIME_ZONE, toLagosDateTimeLocal } from "@/lib/time";
import type { BookableApplication, CalendarEvent } from "@/lib/dashboard-data";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Reallow only operates in Nigeria (WAT, no DST), so every calendar day is a Lagos day.
const dayKey = (date: Date | string) => toLagosDateTimeLocal(new Date(date)).slice(0, 10);
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-NG", { timeZone: LAGOS_TIME_ZONE, hour: "numeric", minute: "2-digit" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", {
    timeZone: LAGOS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const keyToLabel = (key: string) =>
  new Date(`${key}T12:00:00+01:00`).toLocaleDateString("en-NG", {
    timeZone: LAGOS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

function isHeld(event: CalendarEvent) {
  return (event.status === "confirmed" || event.status === "completed") && new Date(event.at).getTime() < Date.now();
}

function headline(event: CalendarEvent): string {
  const title = `“${event.listingTitle}”`;
  if (isHeld(event)) {
    if (event.kind === "verification") return `Reallow verified your property ${title}`;
    if (event.kind === "inspection") return event.side === "landlord" ? `Your property ${title} was inspected` : `You inspected ${title}`;
    return event.side === "landlord" ? `You met with an applicant for ${title}` : `You met with the landlord of ${title}`;
  }
  if (event.kind === "verification") return `Reallow verification visit · ${event.listingTitle}`;
  if (event.kind === "inspection") return `Inspection · ${event.listingTitle}`;
  return event.side === "landlord"
    ? `Meeting with an applicant · ${event.listingTitle}`
    : `Meeting with the landlord · ${event.listingTitle}`;
}

function statusBadge(event: CalendarEvent): { label: string; className: string } {
  const amber = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  const green = "bg-verified/10 text-verified";
  const grey = "bg-foreground/5 text-foreground/60";
  const red = "bg-red-500/10 text-red-600";
  if (event.status === "pending") return { label: event.myTurn ? "Awaiting your response" : "Pending approval", className: amber };
  if (event.status === "declined") return { label: "Declined", className: red };
  if (event.status === "cancelled") return { label: "Cancelled", className: grey };
  if (isHeld(event)) return { label: event.status === "completed" ? "Completed" : "Held", className: grey };
  if (event.kind === "inspection" && event.source === "meeting" && !event.paid)
    return { label: "Time agreed · fee unpaid", className: amber };
  return { label: "Meeting date confirmed", className: green };
}

function dotClass(event: CalendarEvent) {
  if (event.status === "declined" || event.status === "cancelled") return "bg-red-400";
  if (isHeld(event)) return "bg-foreground/30";
  if (event.status === "pending" || (event.kind === "inspection" && event.source === "meeting" && !event.paid))
    return "bg-amber-500";
  return "bg-verified";
}

function EventCard({ event, walletBalanceNGN }: { event: CalendarEvent; walletBalanceNGN: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [counterTime, setCounterTime] = useState("");
  const [rating, setRating] = useState(false);
  const badge = statusBadge(event);

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
      setError(data?.error ?? "Couldn't send your response");
      return;
    }
    setCountering(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{headline(event)}</p>
          <p className="mt-0.5 text-xs text-foreground/60">
            {longDate(event.at)} · {timeOf(event.at)}
            {event.kind === "inspection" && " · with a Reallow agent"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {event.status === "pending" && !event.myTurn && event.source === "meeting" && (
        <p className="mt-2 text-xs text-foreground/50">Waiting for the other side to accept, decline, or suggest another time.</p>
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
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond({ action: "decline" })}
              className="h-8 rounded-full border border-line px-3.5 text-xs font-medium disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCountering((v) => !v)}
              className="h-8 rounded-full border border-line px-3.5 text-xs font-medium disabled:opacity-50"
            >
              Suggest another time
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
                Send
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
          Confirm or change this time
        </Link>
      )}

      {event.payAmountNGN !== undefined && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-foreground/60">
            Pay the inspection fee to lock this in — it covers Reallow&apos;s agent attending.
          </p>
          <PayChoice
            endpoint={`/api/meetings/${event.id}/pay`}
            amountNGN={event.payAmountNGN}
            walletBalanceNGN={walletBalanceNGN}
            label={`Pay ₦${event.payAmountNGN.toLocaleString()} inspection fee`}
          />
        </div>
      )}

      {event.canLeaveFeedback &&
        (rating ? (
          <MeetingFeedbackForm targetType={event.source} targetId={event.id} onCancel={() => setRating(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setRating(true)}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
          >
            ★ Rate this {event.kind === "meeting" ? "meeting" : "visit"}
          </button>
        ))}
      {event.feedbackGiven && <p className="mt-2 text-xs text-foreground/50">Thanks — you left feedback on this.</p>}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function MeetingsCalendar({
  events,
  bookable,
  walletBalanceNGN,
  initialTicketId,
  initialKind,
}: {
  events: CalendarEvent[];
  bookable: BookableApplication[];
  walletBalanceNGN: number;
  initialTicketId?: string;
  initialKind?: "inspection" | "meeting";
}) {
  const router = useRouter();
  const todayKey = dayKey(new Date());
  const [month, setMonth] = useState(() => todayKey.slice(0, 7)); // "YYYY-MM"
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const preselected = bookable.find((b) => b.ticketId === initialTicketId);
  const [booking, setBooking] = useState(Boolean(preselected));
  const [ticketId, setTicketId] = useState(preselected?.ticketId ?? bookable[0]?.ticketId ?? "");
  const [kind, setKind] = useState<"inspection" | "meeting">(initialKind ?? "meeting");
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

  const monthLabel = new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  const selectedApp = bookable.find((b) => b.ticketId === ticketId);
  const dayEvents = eventsByDay.get(selectedDay) ?? [];

  async function sendRequest() {
    setBookError(null);
    if (!ticketId) return setBookError("Choose which application this is for");
    if (selectedDay < todayKey) return setBookError("Pick today or a later day on the calendar");
    setSending(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, kind, proposedTime: `${selectedDay}T${time}` }),
    });
    const data = await res.json().catch(() => null);
    setSending(false);
    if (!res.ok) return setBookError(data?.error ?? "Couldn't send the request");
    setBookSent(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* What's next */}
      <div className={`rounded-xl p-4 ${next ? "bg-clay/10" : "bg-foreground/5"}`}>
        {next ? (
          <>
            <p className="text-xs font-medium tracking-wide text-clay uppercase">Up next</p>
            <p className="mt-1 text-sm font-medium">{headline(next)}</p>
            <p className="mt-0.5 text-xs text-foreground/60">
              {longDate(next.at)} · {timeOf(next.at)} · {statusBadge(next).label}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium">You don&apos;t have an upcoming meeting.</p>
        )}
        {upcoming.length > 1 && (
          <p className="mt-2 text-xs text-foreground/50">+{upcoming.length - 1} more upcoming</p>
        )}
      </div>

      {needsAction.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">Needs your attention</p>
          <div className="flex flex-col gap-2">
            {needsAction.map((event) => (
              <EventCard key={`${event.source}-${event.id}`} event={event} walletBalanceNGN={walletBalanceNGN} />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">Your meeting history</p>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {(showAllHistory ? history : history.slice(0, 3)).map((event) => (
              <li key={`${event.source}-${event.id}`} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-xs text-foreground/50">{longDate(event.at).replace(/^\w+, /, "")}</span>
                <span className="min-w-0">On this day, {headline(event).charAt(0).toLowerCase() + headline(event).slice(1)}.</span>
              </li>
            ))}
          </ul>
          {history.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllHistory((v) => !v)}
              className="mt-1.5 text-xs text-clay hover:underline"
            >
              {showAllHistory ? "Show less" : `Show all ${history.length}`}
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
          + Book an inspection or meeting
        </button>
      )}

      {booking && (
        <div className="rounded-xl border border-clay/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Book an inspection or meeting</p>
            <button type="button" onClick={() => setBooking(false)} className="text-xs text-foreground/50 hover:text-foreground">
              Close
            </button>
          </div>
          {bookSent ? (
            <p className="mt-3 text-sm text-verified">
              Request sent — it shows as pending approval on the calendar until the other side responds.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-foreground/60">
                Application
                <select
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="h-10 rounded-md border border-line bg-transparent px-2 text-sm text-foreground"
                >
                  {bookable.map((b) => (
                    <option key={b.ticketId} value={b.ticketId}>
                      {b.listingTitle} — {b.side === "landlord" ? "an applicant you accepted" : "your accepted application"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                {(["inspection", "meeting"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setKind(option)}
                    className={`h-9 flex-1 rounded-full border text-sm font-medium ${
                      kind === option ? "border-transparent bg-clay text-white" : "border-line"
                    }`}
                  >
                    {option === "inspection" ? "Book inspection" : "Book meeting"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-foreground/50">
                {kind === "inspection"
                  ? `A Reallow agent attends. Once the time is agreed, the applicant pays a ₦${(selectedApp?.inspectionFeeNGN ?? 0).toLocaleString()} inspection fee.`
                  : "A free meeting between you and the other side, arranged through Reallow."}
                {kind === "inspection" && selectedApp && !selectedApp.applicantVerified &&
                  (selectedApp.side === "tenant"
                    ? " You'll need to verify your identity first."
                    : " The applicant needs to verify their identity first.")}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1 text-xs text-foreground/60">
                  Day
                  <span className="flex h-10 items-center rounded-md border border-line px-3 text-sm text-foreground">
                    {keyToLabel(selectedDay)}
                  </span>
                </div>
                <label className="flex flex-col gap-1 text-xs text-foreground/60">
                  Time
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
                  {sending ? "Sending…" : "Send request"}
                </button>
              </div>
              <p className="text-xs text-foreground/50">Tap a day on the calendar below to change the date.</p>
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
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/5"
          >
            ‹
          </button>
          <p className="text-sm font-semibold">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/5"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-foreground/40">
          {WEEKDAYS.map((d) => (
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
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-verified" /> Confirmed</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending approval</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-foreground/30" /> Past</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Declined</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{keyToLabel(selectedDay)}</p>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-foreground/50">Nothing on this day.</p>
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
          Once a landlord accepts your application — or you accept an applicant — you can book inspections and meetings here.
        </p>
      )}
    </div>
  );
}
