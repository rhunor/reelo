import { redirect } from "next/navigation";
import { ensureReferralCode } from "@/lib/referrals";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { CheckInButton } from "@/components/check-in-button";
import { StaffMediaUploader } from "@/components/staff-media-uploader";
import { toggleVerificationTask, completeInspectionVisit } from "@/app/dashboard/staff/actions";
import { scheduleInspection } from "@/app/dashboard/admin/actions";
import { IdentityHeader } from "@/components/dashboard/identity-header";
import { DashboardPanels } from "@/components/dashboard/dashboard-panels";
import { VisitReportForm } from "@/components/visit-report-form";
import { StaffRateVisit } from "@/components/staff-rate-visit";
import { loadDashboardData } from "@/lib/dashboard-data";
import { formatLagos, toLagosDateTimeLocal } from "@/lib/time";
import type { Property } from "@/types/models";

// Visits that need a call first float to the top: never scheduled, or the landlord said
// the scheduled time doesn't work.
function needsScheduling(listing: Property) {
  return !listing.verification.scheduledFor || listing.verification.landlordResponse === "declined";
}

function PhoneLink({ phone }: { phone?: string }) {
  if (!phone) return <span className="text-foreground/50">no phone on file</span>;
  return (
    <a href={`tel:${phone}`} className="text-clay underline">
      {phone}
    </a>
  );
}

export const dynamic = "force-dynamic";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

function hasHappened(date?: Date): boolean {
  return Boolean(date && new Date(date).getTime() <= Date.now());
}

const TASKS: { key: "videoOfProperty" | "videoOfRoad" | "photos"; label: string }[] = [
  { key: "videoOfProperty", label: "Video of the property" },
  { key: "videoOfRoad", label: "Video of the road to the property" },
  { key: "photos", label: "Photos of the property" },
];

export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { all } = await searchParams;

  const { properties, users, inspectionBookings, meetings, meetingFeedback } = await getCollections();
  const found = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!found) redirect("/login");
  // Older accounts predate referral codes — give them one now.
  const me = await ensureReferralCode(found);
  // Staff earn referral commissions too, so they get the same wallet and history windows.
  const money = await loadDashboardData(session.user.id, []);
  // Staff see their own city by default; "Show all cities" lifts the filter.
  const base = me.staffBase;
  const cityFilter = base && all !== "1" ? { "location.state": base } : {};
  const thirtyDaysAgo = daysAgo(30);

  const [allPending, legacyBookings, paidInspections] = await Promise.all([
    properties.find({ status: "pending_verification", ...cityFilter }).sort({ createdAt: 1 }).toArray(),
    inspectionBookings.find({ status: "confirmed" }).toArray(),
    // Inspections booked through the dashboard's Meetings window only need an agent once
    // the time is agreed and the applicant has paid.
    meetings.find({ kind: "inspection", status: "confirmed", paidAt: { $exists: true } }).toArray(),
  ]);
  const confirmedBookings = [
    ...legacyBookings.map((b) => ({ ...b, source: "booking" as const })),
    ...paidInspections.map((m) => ({ ...m, source: "meeting" as const })),
  ].sort((a, b) => +new Date(a.scheduledFor ?? 0) - +new Date(b.scheduledFor ?? 0));
  const pendingListings = [
    ...allPending.filter(needsScheduling),
    ...allPending
      .filter((l) => !needsScheduling(l))
      .sort((a, b) => +new Date(a.verification.scheduledFor!) - +new Date(b.verification.scheduledFor!)),
  ];
  const toScheduleCount = allPending.filter(needsScheduling).length;
  const visitDone = (l: Property) => Boolean(l.verification.checkedInAt) || hasHappened(l.verification.scheduledFor);
  const awaitingReportCount = allPending.filter((l) => visitDone(l) && !l.verification.agentReport).length;

  // Inspections finished in the last 30 days, for the agent to rate.
  const [completedMeetings, completedBookings, myFeedback] = await Promise.all([
    meetings.find({ kind: "inspection", status: "completed", updatedAt: { $gte: thirtyDaysAgo } }).sort({ updatedAt: -1 }).toArray(),
    inspectionBookings.find({ status: "completed", scheduledFor: { $gte: thirtyDaysAgo } }).toArray(),
    meetingFeedback.find({ userId: new ObjectId(session.user.id) }).project({ targetId: 1 }).toArray(),
  ]);
  const ratedIds = new Set(myFeedback.map((f) => f.targetId.toString()));
  const completed = [
    ...completedMeetings.map((m) => ({ id: m._id!.toString(), source: "meeting" as const, at: m.scheduledFor ?? m.updatedAt, listingId: m.listingId })),
    ...completedBookings.map((b) => ({ id: b._id!.toString(), source: "inspection_booking" as const, at: b.scheduledFor ?? b.createdAt, listingId: b.listingId })),
  ];
  const completedListings = completed.length
    ? await properties.find({ _id: { $in: completed.map((c) => c.listingId) } }, { projection: { title: 1, location: 1 } }).toArray()
    : [];
  const completedTitle = new Map(completedListings.map((l) => [l._id!.toString(), l.title]));

  const landlordIds = pendingListings.map((l) => l.landlordId);
  const tenantIds = confirmedBookings.map((b) => b.tenantId);
  const bookingLandlordIds = confirmedBookings.map((b) => b.landlordId);
  const bookingListingIds = confirmedBookings.map((b) => b.listingId);

  const [relatedUsers, bookingListings] = await Promise.all([
    users.find({ _id: { $in: [...landlordIds, ...tenantIds, ...bookingLandlordIds] } }).toArray(),
    bookingListingIds.length ? properties.find({ _id: { $in: bookingListingIds } }).toArray() : [],
  ]);
  const userById = new Map(relatedUsers.map((u) => [u._id!.toString(), u]));
  const listingById = new Map(
    [...pendingListings, ...bookingListings].map((l) => [l._id!.toString(), l]),
  );

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <IdentityHeader user={me} greeting="Field team" />

      <section className="mt-6">
        <DashboardPanels
          panels={["transactions", "wallet"]}
          events={[]}
          bookable={[]}
          ledger={money.ledger}
          walletBalanceNGN={me.walletBalanceNGN ?? 0}
          referralCode={me.referralCode}
          earnings={money.earnings}
          withdrawals={money.withdrawals}
          hasBankDetails={Boolean(me.bankDetails?.accountNumber)}
        />
      </section>

      {/* What needs doing */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <a
          href="#verifications"
          className={`rounded-2xl border p-4 transition-colors hover:border-clay/60 ${
            pendingListings.length ? "border-clay/40 bg-clay/[0.06]" : "border-line"
          }`}
        >
          <p className="text-2xl font-semibold tabular-nums">{pendingListings.length}</p>
          <p className="mt-0.5 text-sm font-medium">
            {pendingListings.length === 1 ? "Property to verify" : "Properties to verify"}
          </p>
          <p className="text-xs text-foreground/50">
            {pendingListings.length ? "Visit, check in, and file your report" : "Nothing waiting — nice work"}
          </p>
        </a>
        <a
          href="#verifications"
          className={`rounded-2xl border p-4 transition-colors hover:border-clay/60 ${
            toScheduleCount ? "border-amber-500/40 bg-amber-500/[0.07]" : "border-line"
          }`}
        >
          <p className="text-2xl font-semibold tabular-nums">{toScheduleCount}</p>
          <p className="mt-0.5 text-sm font-medium">Need a call to schedule</p>
          <p className="text-xs text-foreground/50">Call the landlord, then set the time</p>
        </a>
        <a href="#inspections" className="rounded-2xl border border-line p-4 transition-colors hover:border-clay/60">
          <p className="text-2xl font-semibold tabular-nums">{confirmedBookings.length}</p>
          <p className="mt-0.5 text-sm font-medium">Tenant inspections</p>
          <p className="text-xs text-foreground/50">Paid and confirmed — go with the applicant</p>
        </a>
      </section>

      {awaitingReportCount > 0 && (
        <p className="mt-4 rounded-2xl border border-clay/40 bg-clay/[0.06] px-4 py-3 text-sm">
          <span className="font-semibold">You have {awaitingReportCount} visit{awaitingReportCount === 1 ? "" : "s"} waiting for a report.</span>{" "}
          Take photos and write up what you saw so admin can approve or reject the listing.
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="verifications" className="scroll-mt-24 text-lg font-semibold">Property verification visits</h2>
        {base ? (
          <a href={all === "1" ? "/dashboard/staff" : "/dashboard/staff?all=1"} className="text-xs text-clay hover:underline">
            {all === "1" ? `Show only ${base}` : `Showing ${base} · Show all cities`}
          </a>
        ) : (
          <span className="text-xs text-foreground/50">No base city set — ask an admin to set yours.</span>
        )}
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Call the landlord to agree a time, then set it here — they get a notification and an
        email to confirm it.
      </p>
      {pendingListings.length === 0 && <p className="mt-4 text-foreground/50">Nothing awaiting verification.</p>}
      <div className="mt-4 flex flex-col gap-4">
        {pendingListings.map((listing) => {
          const landlord = userById.get(listing.landlordId.toString());
          const tasks = listing.verification.tasks ?? {
            videoOfProperty: false,
            videoOfRoad: false,
            photos: false,
          };
          const { scheduledFor, landlordResponse } = listing.verification;

          return (
            <div key={listing._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="font-medium break-words">{listing.title}</p>
              <p className="mt-1 text-sm text-foreground/70">
                Landlord: {landlord?.name ?? "Unknown"} · <PhoneLink phone={landlord?.phone} />
              </p>
              <p className="mt-1 text-sm text-foreground/70 break-words">
                {listing.fullAddress ?? `${listing.location.city}, ${listing.location.state}`}
              </p>

              <div className="mt-3 rounded-md bg-foreground/[0.03] p-3 text-sm">
                {!scheduledFor ? (
                  <p className="font-medium text-amber-600">Not scheduled yet — call the landlord.</p>
                ) : (
                  <p>
                    <span className="font-medium">{formatLagos(scheduledFor)}</span>
                    {" · "}
                    {landlordResponse === "confirmed" ? (
                      <span className="text-verified">confirmed by landlord</span>
                    ) : landlordResponse === "declined" ? (
                      <span className="text-red-600">landlord needs a different time — call them</span>
                    ) : (
                      <span className="text-foreground/60">awaiting landlord&apos;s confirmation</span>
                    )}
                  </p>
                )}
                {!landlord?.verifiedBadge ? (
                  <p className="mt-2 text-xs text-red-600">
                    Landlord hasn&apos;t verified their identity yet — you can&apos;t schedule until they do.
                  </p>
                ) : (
                  <form action={scheduleInspection} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="listingId" value={listing._id!.toString()} />
                    <input
                      name="scheduledFor"
                      type="datetime-local"
                      required
                      defaultValue={scheduledFor ? toLagosDateTimeLocal(new Date(scheduledFor)) : undefined}
                      className="h-9 rounded-md border border-line bg-transparent px-3 text-sm"
                    />
                    <button type="submit" className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white">
                      {scheduledFor ? "Update time" : "Set visit time"}
                    </button>
                  </form>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-1">
                {TASKS.map((task) => (
                  <form key={task.key} action={toggleVerificationTask}>
                    <input type="hidden" name="listingId" value={listing._id!.toString()} />
                    <input type="hidden" name="task" value={task.key} />
                    <button
                      type="submit"
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                        tasks[task.key] ? "border-verified bg-verified/5 text-verified" : "border-line"
                      }`}
                    >
                      <span>{tasks[task.key] ? "✓" : "○"}</span>
                      {task.label}
                    </button>
                  </form>
                ))}
              </div>

              <StaffMediaUploader listingId={listing._id!.toString()} />

              {scheduledFor && !listing.verification.checkedInAt && (
                <div className="mt-3">
                  <CheckInButton listingId={listing._id!.toString()} />
                </div>
              )}
              {listing.verification.checkedInAt && (
                <p className="mt-3 text-sm text-verified">
                  Checked in {formatLagos(listing.verification.checkedInAt)}
                </p>
              )}

              <div className="mt-4 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Visit report</p>
                  {listing.verification.agentReport && (
                    <span className="rounded-full bg-verified/10 px-2 py-0.5 text-[11px] font-medium text-verified">
                      Filed {formatLagos(listing.verification.agentReport.submittedAt)}
                    </span>
                  )}
                </div>
                {visitDone(listing) ? (
                  <div className="mt-3">
                    <VisitReportForm listingId={listing._id!.toString()} existing={listing.verification.agentReport} />
                    {listing.verification.agentReport && (
                      <div className="mt-4 border-t border-line pt-3">
                        <StaffRateVisit
                          targetType="verification"
                          targetId={listing._id!.toString()}
                          alreadyRated={ratedIds.has(listing._id!.toString())}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-foreground/50">
                    After the visit (check in when you arrive), take photos and write your report here.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 id="inspections" className="mt-10 scroll-mt-24 text-lg font-semibold">Tenant inspection visits</h2>
      {confirmedBookings.length === 0 && <p className="mt-4 text-foreground/50">Nothing scheduled.</p>}
      <div className="mt-4 flex flex-col gap-4">
        {confirmedBookings.map((booking) => {
          const tenant = userById.get(booking.tenantId.toString());
          const bookingLandlord = userById.get(booking.landlordId.toString());
          const listing = listingById.get(booking.listingId.toString());
          return (
            <div key={booking._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="font-medium">{booking.scheduledFor && formatLagos(booking.scheduledFor)}</p>
              <p className="mt-1 text-sm text-foreground/70">
                Tenant: {tenant?.name ?? "Unknown"} · <PhoneLink phone={tenant?.phone} />
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                Landlord: {bookingLandlord?.name ?? "Unknown"} · <PhoneLink phone={bookingLandlord?.phone} />
              </p>
              {listing && (
                <p className="mt-1 text-sm text-foreground/70 break-words">
                  {listing.fullAddress ?? `${listing.location.city}, ${listing.location.state}`}
                </p>
              )}
              <form action={completeInspectionVisit} className="mt-3">
                <input type="hidden" name="bookingId" value={booking._id!.toString()} />
                <input type="hidden" name="source" value={booking.source} />
                <button
                  type="submit"
                  className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white"
                >
                  Mark inspection completed
                </button>
              </form>
            </div>
          );
        })}
      </div>
      {completed.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Recently completed inspections</h2>
          <p className="mt-1 text-sm text-foreground/60">Rate how each one went — late, no-shows, or a smooth visit.</p>
          <div className="mt-4 flex flex-col divide-y divide-line rounded-2xl border border-line">
            {completed.map((visit) => (
              <div key={visit.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{completedTitle.get(visit.listingId.toString()) ?? "Property"}</p>
                  <p className="text-xs text-foreground/50">{formatLagos(visit.at)}</p>
                </div>
                <StaffRateVisit targetType={visit.source} targetId={visit.id} alreadyRated={ratedIds.has(visit.id)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
