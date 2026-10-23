import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifiedBadge } from "@/components/verified-badge";
import { PreferCandidateButton } from "@/components/prefer-candidate-button";
import { InspectionNegotiation } from "@/components/inspection-negotiation";
import { ReportButton } from "@/components/report-button";
import { redactContactInfo } from "@/lib/contact-guard";
import { formatLagos } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LandlordCandidatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getT();

  const { properties, tickets, users, inspectionBookings, meetings, agreements } = await getCollections();

  const listings = await properties.find({ landlordId: new ObjectId(session.user.id) }).toArray();
  const listingIds = listings.map((listing) => listing._id!);

  const inquiries =
    listingIds.length === 0
      ? []
      : await tickets
          .find({ listingId: { $in: listingIds }, userId: { $ne: new ObjectId(session.user.id) }, withdrawnAt: { $exists: false } })
          .sort({ createdAt: -1 })
          .toArray();

  const tenantIds = [...new Set(inquiries.map((ticket) => ticket.userId.toString()))].map(
    (id) => new ObjectId(id),
  );
  const tenants = tenantIds.length === 0 ? [] : await users.find({ _id: { $in: tenantIds } }).toArray();
  const tenantById = new Map(tenants.map((tenant) => [tenant._id!.toString(), tenant]));
  const listingById = new Map(listings.map((listing) => [listing._id!.toString(), listing]));

  const approvedTicketIds = inquiries
    .filter((ticket) => (ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined)) === "approved")
    .map((ticket) => ticket._id!);
  const bookings =
    approvedTicketIds.length === 0
      ? []
      : await inspectionBookings.find({ ticketId: { $in: approvedTicketIds } }).toArray();
  const bookingByTicketId = new Map(bookings.map((booking) => [booking.ticketId!.toString(), booking]));

  // Who you've already met, and where each payment request stands — so you can scroll
  // the list and pick who to ask for payment.
  const [heldMeetings, requests] = approvedTicketIds.length
    ? await Promise.all([
        meetings
          .find({ ticketId: { $in: approvedTicketIds }, status: { $in: ["confirmed", "completed"] }, scheduledFor: { $lte: new Date() } })
          .sort({ scheduledFor: -1 })
          .toArray(),
        agreements.find({ listingId: { $in: listingIds }, ticketId: { $in: approvedTicketIds } }).sort({ createdAt: -1 }).toArray(),
      ])
    : [[], []];
  const metAt = new Map<string, Date>();
  for (const m of heldMeetings) if (!metAt.has(m.ticketId.toString())) metAt.set(m.ticketId.toString(), m.scheduledFor!);
  const requestByTicket = new Map<string, (typeof requests)[number]>();
  for (const r of requests) if (r.ticketId && !requestByTicket.has(r.ticketId.toString())) requestByTicket.set(r.ticketId.toString(), r);
  const requestLabel = (r: (typeof requests)[number]) =>
    r.payment.status === "paid_to_reallow" || r.payment.status === "paid_out_to_landlord"
      ? { text: t("payReq.badgePaid"), className: "bg-verified/10 text-verified" }
      : r.status === "superseded" || r.status === "cancelled"
        ? null
        : { text: t("payReq.badgeWaiting"), className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-clay">
        ← {t("nav.dashboard")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{t("dash.applications")}</h1>
      <p className="mt-2 text-sm text-foreground/70">{t("app.listIntro")}</p>

      {inquiries.length === 0 && (
        <p className="mt-8 text-foreground/50">{t("app.none")}</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {inquiries.map((ticket) => {
          const tenant = tenantById.get(ticket.userId.toString());
          const listing = listingById.get(ticket.listingId!.toString());
          const profile = tenant?.tenantProfile?.visibleToLandlords ? tenant.tenantProfile : null;

          return (
            <div key={ticket._id!.toString()} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-foreground/50">{listing?.title ?? t("app.aListing")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-medium">{profile ? tenant?.name : t("app.applicant")}</p>
                    {tenant?.verifiedBadge ? (
                      <VerifiedBadge />
                    ) : (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                        {t("app.notVerified")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(metAt.has(ticket._id!.toString()) || requestByTicket.has(ticket._id!.toString())) && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                  {metAt.has(ticket._id!.toString()) && (
                    <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-foreground/70">
                      {t("payReq.metOn", { date: formatLagos(metAt.get(ticket._id!.toString())!) })}
                    </span>
                  )}
                  {(() => {
                    const r = requestByTicket.get(ticket._id!.toString());
                    const label = r && requestLabel(r);
                    return label ? <span className={`rounded-full px-2 py-0.5 ${label.className}`}>{label.text}</span> : null;
                  })()}
                </div>
              )}
              {(ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined)) === "approved" &&
                listing?.status === "published" && (
                  <Link
                    href={`/dashboard/applications/${ticket._id}`}
                    className="mt-3 inline-flex h-8 items-center rounded-full border border-clay/40 px-3.5 text-xs font-medium text-clay hover:bg-clay/5"
                  >
                    {t(requestByTicket.has(ticket._id!.toString()) ? "payReq.viewRequest" : "payReq.title")} →
                  </Link>
                )}

              {tenant && (
                <div className="mt-1">
                  <ReportButton targetType="user" targetId={tenant._id!.toString()} label={t("report.applicant")} />
                </div>
              )}

              {profile ? (
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  {profile.occupation && (
                    <div>
                      <dt className="text-foreground/50">{t("profile.occupation")}</dt>
                      <dd className="mt-0.5">{profile.occupation}</dd>
                    </div>
                  )}
                  {profile.monthlyIncomeNGN !== undefined && (
                    <div>
                      <dt className="text-foreground/50">{t("app.monthlyIncome")}</dt>
                      <dd className="mt-0.5">₦{profile.monthlyIncomeNGN.toLocaleString()}</dd>
                    </div>
                  )}
                  {profile.householdSize !== undefined && (
                    <div>
                      <dt className="text-foreground/50">{t("app.householdSize")}</dt>
                      <dd className="mt-0.5">{profile.householdSize}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-foreground/50">
                  {t("app.sharedNone")}
                </p>
              )}
              {profile?.aboutMe && <p className="mt-2 text-sm text-foreground/70">{redactContactInfo(profile.aboutMe)}</p>}

              <Link
                href={`/dashboard/applications/${ticket._id}`}
                className="mt-3 inline-block text-sm font-medium text-clay hover:underline"
              >
                {t("app.viewProfile")} →
              </Link>

              <div className="mt-4">
                <PreferCandidateButton
                  ticketId={ticket._id!.toString()}
                  decision={ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined)}
                />
              </div>

              {bookingByTicketId.has(ticket._id!.toString()) && (
                <InspectionNegotiation
                  booking={bookingByTicketId.get(ticket._id!.toString())!}
                  viewerRole="landlord"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
