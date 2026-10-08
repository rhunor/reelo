import { redirect } from "next/navigation";
import { ensureReferralCode } from "@/lib/referrals";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { IdentityHeader } from "@/components/dashboard/identity-header";
import { rejectListing, scheduleInspection } from "./actions";
import { ApproveListingForm } from "@/components/approve-listing-form";
import { CheckInButton } from "@/components/check-in-button";
import { StatGrid, QuickLinks, AccountSettingsLink } from "@/components/dashboard-shell";
import { formatLagos, toLagosDateTimeLocal } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

const AGENT_CONDITION_LABEL = {
  matches: "Matches the listing",
  minor_differences: "Minor differences",
  does_not_match: "Doesn't match",
} as const;

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { properties, users, tickets, agreements, withdrawalRequests, reports } = await getCollections();
  const [found, pending, openTicketCount, payoutPendingCount, withdrawalPendingCount, openReportCount] = await Promise.all([
    users.findOne({ _id: new ObjectId(session.user.id) }),
    properties.find({ status: "pending_verification" }).sort({ createdAt: 1 }).toArray(),
    tickets.countDocuments({ status: { $in: ["open", "in_progress"] } }),
    agreements.countDocuments({ "payment.status": "paid_to_reallow" }),
    withdrawalRequests.countDocuments({ status: "pending" }),
    reports.countDocuments({ status: { $in: ["open", "reviewing"] } }),
  ]);
  if (!found) redirect("/login");
  // Older accounts predate referral codes — give them one now.
  const me = await ensureReferralCode(found);

  const landlords = await users
    .find({ _id: { $in: pending.map((listing) => listing.landlordId) } })
    .project({ verifiedBadge: 1, name: 1, phone: 1 })
    .toArray();
  const landlordById = new Map(landlords.map((landlord) => [landlord._id!.toString(), landlord]));

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <IdentityHeader user={me} greeting="Admin dashboard" />

      <StatGrid
        stats={[
          { label: "Awaiting verification", value: pending.length, accent: pending.length > 0 ? "amber" : undefined },
          { label: "Open support tickets", value: openTicketCount, accent: openTicketCount > 0 ? "clay" : undefined },
          { label: "Payouts pending", value: payoutPendingCount },
          { label: "Withdrawals pending", value: withdrawalPendingCount, accent: withdrawalPendingCount > 0 ? "clay" : undefined },
          { label: "Open reports", value: openReportCount, accent: openReportCount > 0 ? "amber" : undefined },
        ]}
      />

      <QuickLinks
        links={[
          { href: "/dashboard/admin/listings", label: "Manage listings", primary: true },
          { href: "/dashboard/admin/applications", label: "Applications (Reallow listings)" },
          { href: "/dashboard/admin/listings/new", label: "Post a property directly" },
          { href: "/dashboard/admin/agreements", label: "Tenancy agreements" },
          { href: "/dashboard/support", label: "Support queue" },
          { href: "/dashboard/admin/users", label: "People" },
          { href: "/dashboard/admin/reports", label: openReportCount ? `Reports (${openReportCount})` : "Reports" },
          { href: "/dashboard/admin/referrals", label: "Referrals & withdrawals" },
          { href: "/dashboard/admin/feedback", label: "Meeting feedback" },
          { href: "/dashboard/admin/insights", label: "How people found us" },
          { href: "/dashboard/admin/analytics", label: "Site analytics" },
        ]}
      />
      <div className="mt-2">
        <AccountSettingsLink />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Listings awaiting verification</h2>

      {pending.length === 0 && (
        <p className="mt-4 text-foreground/70">Nothing pending right now.</p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {pending.map((listing) => {
          const landlord = landlordById.get(listing.landlordId.toString());
          const landlordVerified = Boolean(landlord?.verifiedBadge);
          const { scheduledFor, landlordResponse } = listing.verification;
          return (
          <div key={listing._id!.toString()} className="rounded-lg border border-line p-4">
            <p className="font-medium break-words">{listing.title}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {listing.location.city}, {listing.location.state} · ₦{listing.priceNGN.toLocaleString()}
            </p>
            {listing.fullAddress && (
              <p className="mt-1 text-sm text-foreground/70 break-words">{listing.fullAddress}</p>
            )}
            <p className="mt-1 text-sm text-foreground/70">
              Landlord: {landlord?.name ?? "Unknown"}
              {" · "}
              {landlord?.phone ? (
                <a href={`tel:${landlord.phone}`} className="text-clay underline">
                  {landlord.phone}
                </a>
              ) : (
                <span className="text-foreground/50">no phone on file</span>
              )}
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Submitted {formatLagos(listing.createdAt)}
              {scheduledFor && (
                <>
                  {" · "}Visit {formatLagos(scheduledFor)} (
                  {landlordResponse === "confirmed"
                    ? "confirmed"
                    : landlordResponse === "declined"
                      ? "landlord needs a different time"
                      : "awaiting confirmation"}
                  )
                </>
              )}
              {listing.verification.checkedInAt && (
                <> · Checked in {formatLagos(listing.verification.checkedInAt)}</>
              )}
            </p>

            {listing.verification.agentReport ? (
              <details className="mt-3 rounded-xl border border-line p-3" open>
                <summary className="cursor-pointer text-sm font-semibold">
                  Agent&apos;s visit report{" "}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      listing.verification.agentReport.condition === "matches"
                        ? "bg-verified/10 text-verified"
                        : listing.verification.agentReport.condition === "minor_differences"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {AGENT_CONDITION_LABEL[listing.verification.agentReport.condition]}
                  </span>
                </summary>
                <p className="mt-2 text-xs text-foreground/50">
                  By {listing.verification.agentReport.submittedByName ?? "a field agent"} ·{" "}
                  {formatLagos(listing.verification.agentReport.submittedAt)}
                  {listing.verification.agentReport.rating ? (
                    <>
                      {" · "}
                      <span className="text-amber-500">{"★".repeat(listing.verification.agentReport.rating)}</span>
                      <span className="text-foreground/20">{"★".repeat(5 - listing.verification.agentReport.rating)}</span>
                    </>
                  ) : null}
                </p>
                {listing.verification.agentReport.narration && (
                  <p className="mt-2 text-sm whitespace-pre-line break-words">{listing.verification.agentReport.narration}</p>
                )}
                {listing.verification.agentReport.comments && (
                  <p className="mt-2 rounded-lg bg-foreground/5 p-2 text-sm break-words">
                    <span className="text-xs font-medium text-foreground/50">Comments: </span>
                    {listing.verification.agentReport.comments}
                  </p>
                )}
                {(
                  [
                    ["The property", listing.verification.agentReport.photoUrls, listing.verification.agentReport.videoUrls],
                    ["The road to the property", listing.verification.agentReport.roadPhotoUrls, listing.verification.agentReport.roadVideoUrls],
                  ] as const
                ).map(([label, photos, videos]) =>
                  photos?.length || videos?.length ? (
                    <div key={label} className="mt-3">
                      <p className="text-xs font-medium text-foreground/50">{label}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {photos?.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                            <img src={url} alt="" className="h-20 w-28 rounded-lg object-cover hover:opacity-90" />
                          </a>
                        ))}
                        {videos?.map((url) => (
                          <video key={url} src={url} controls preload="metadata" className="h-20 w-28 rounded-lg bg-black object-cover" />
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </details>
            ) : (
              listing.verification.scheduledFor && (
                <p className="mt-2 text-xs text-foreground/50">No visit report filed yet.</p>
              )
            )}

            {!landlordVerified && (
              <p className="mt-2 text-xs font-medium text-red-600">
                Landlord hasn&apos;t verified their identity yet — can&apos;t schedule or approve
                until they do.
              </p>
            )}

            {listing.verification.scheduledFor && !listing.verification.checkedInAt && (
              <div className="mt-3">
                <CheckInButton listingId={listing._id!.toString()} />
              </div>
            )}

            <form action={scheduleInspection} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="listingId" value={listing._id!.toString()} />
              <input
                name="scheduledFor"
                type="datetime-local"
                defaultValue={scheduledFor ? toLagosDateTimeLocal(new Date(scheduledFor)) : undefined}
                required
                className="h-9 rounded-md border border-line px-3 text-sm bg-transparent"
              />
              <SubmitButton
                disabled={!landlordVerified}
                className="h-9 rounded-full border border-line px-4 text-sm font-medium disabled:opacity-40"
              >
                {scheduledFor ? "Update visit time" : "Schedule visit"}
              </SubmitButton>
            </form>

            <div className="mt-4 flex flex-col gap-3">
              <ApproveListingForm
                listingId={listing._id!.toString()}
                photoUrls={listing.photoUrls}
                videoUrls={listing.videoUrls ?? []}
                disabled={!landlordVerified}
              />

              <form action={rejectListing} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="listingId" value={listing._id!.toString()} />
                <input
                  name="reason"
                  placeholder="Rejection reason"
                  className="h-9 min-w-0 flex-1 rounded-md border border-line px-3 text-sm bg-transparent"
                />
                <SubmitButton
                  className="h-9 rounded-full border border-line px-4 text-sm font-medium"
                >
                  Reject
                </SubmitButton>
              </form>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
