import Link from "next/link";
import { getCollections } from "@/lib/db";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import { EventCard } from "@/components/dashboard/meetings-calendar";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatLagos } from "@/lib/time";
import type { CalendarEvent, CalendarEventStatus } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

function currentTime(): number {
  return Date.now();
}

// Properties listed by Reallow itself have no landlord who logs in, so admins play the
// landlord here: review applications, then answer inspection/meeting requests.
export default async function AdminApplicationsPage() {
  const { properties, tickets, users, meetings } = await getCollections();
  const reallowId = await getOrCreateReallowLandlordId();
  const listings = await properties.find({ landlordId: reallowId }, { projection: { title: 1, status: 1 } }).toArray();
  const listingIds = listings.map((l) => l._id!);
  const titleOf = (id: { toString(): string }) => listings.find((l) => l._id!.toString() === id.toString())?.title ?? "Property";

  const [applications, meetingList] = listingIds.length
    ? await Promise.all([
        tickets.find({ listingId: { $in: listingIds } }).sort({ createdAt: -1 }).limit(200).toArray(),
        meetings.find({ listingId: { $in: listingIds } }).sort({ createdAt: -1 }).limit(200).toArray(),
      ])
    : [[], []];
  const applicants = applications.length
    ? await users.find({ _id: { $in: applications.map((a) => a.userId) } }, { projection: { name: 1, verifiedBadge: 1 } }).toArray()
    : [];
  const applicantById = new Map(applicants.map((u) => [u._id!.toString(), u]));

  const decisionOf = (t: (typeof applications)[number]) => t.landlordDecision ?? (t.landlordPreferred ? "approved" : undefined);
  const pending = applications.filter((a) => !decisionOf(a));
  const decided = applications.filter((a) => decisionOf(a));

  const now = currentTime();
  // Unpaid applicant proposals haven't been sent to the landlord side yet.
  const events: CalendarEvent[] = meetingList.filter((m) => m.status !== "awaiting_payment").map((m) => {
    const at = m.scheduledFor ?? m.proposedTime;
    return {
      id: m._id!.toString(),
      source: "meeting",
      kind: m.kind,
      side: "landlord",
      listingTitle: titleOf(m.listingId),
      at: new Date(at).toISOString(),
      status: m.status as CalendarEventStatus,
      myTurn: m.status === "pending" && m.proposedBy !== "landlord",
      paid: Boolean(m.paidAt),
      canLeaveFeedback: false,
      feedbackGiven: false,
    };
  });
  const needsAnswer = events.filter((e) => e.myTurn);
  const upcoming = events.filter((e) => !e.myTurn && new Date(e.at).getTime() >= now && (e.status === "pending" || e.status === "confirmed"));

  const row = (a: (typeof applications)[number]) => {
    const applicant = applicantById.get(a.userId.toString());
    const decision = decisionOf(a);
    return (
      <Link
        key={a._id!.toString()}
        href={`/dashboard/applications/${a._id}`}
        className="flex items-center justify-between gap-3 p-4 hover:bg-foreground/[0.03]"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            {applicant?.name ?? "Applicant"} {applicant?.verifiedBadge && <VerifiedBadge />}
          </span>
          <span className="block text-xs text-foreground/60">
            {titleOf(a.listingId!)} · applied {formatLagos(a.createdAt)}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            decision === "approved"
              ? "bg-verified/10 text-verified"
              : decision === "declined"
                ? "bg-foreground/5 text-foreground/50"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          {decision === "approved" ? "Accepted" : decision === "declined" ? "Declined" : "Review →"}
        </span>
      </Link>
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Applications on Reallow&apos;s properties</h1>
      <p className="mt-1 text-sm text-foreground/60">
        For properties listed by Reallow itself, you act as the landlord: review applicants, accept or decline, and answer
        their inspection and meeting requests. {listings.length} Reallow-listed propert{listings.length === 1 ? "y" : "ies"}.
      </p>

      <h2 className="mt-8 text-lg font-semibold">
        Needs your decision <span className="font-normal text-foreground/50">{pending.length}</span>
      </h2>
      <div className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line">
        {pending.length ? pending.map(row) : <p className="p-4 text-sm text-foreground/50">No new applications.</p>}
      </div>

      <h2 className="mt-8 text-lg font-semibold">
        Meeting &amp; inspection requests <span className="font-normal text-foreground/50">{needsAnswer.length}</span>
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {needsAnswer.length ? (
          needsAnswer.map((event) => <EventCard key={event.id} event={event} walletBalanceNGN={0} />)
        ) : (
          <p className="rounded-2xl border border-line p-4 text-sm text-foreground/50">Nothing waiting for an answer.</p>
        )}
      </div>

      {upcoming.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Upcoming</h2>
          <div className="mt-3 flex flex-col gap-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} walletBalanceNGN={0} />
            ))}
          </div>
        </>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Decided</h2>
          <div className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line">{decided.map(row)}</div>
        </>
      )}
    </div>
  );
}
