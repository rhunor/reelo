import Link from "next/link";
import { ensureReferralCode } from "@/lib/referrals";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { loadDashboardData } from "@/lib/dashboard-data";
import { formatLagos } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { DashboardPanels } from "@/components/dashboard/dashboard-panels";
import { IdentityHeader } from "@/components/dashboard/identity-header";
import { ProposeInspectionForm } from "@/components/propose-inspection-form";
import { confirmVerificationInspection, declineVerificationInspection } from "@/app/dashboard/admin/actions";
import type { ListingStatus } from "@/types/models";

export const dynamic = "force-dynamic";

const STAFF_DASHBOARD: Record<string, string> = {
  admin: "/dashboard/admin",
  support: "/dashboard/support",
  staff: "/dashboard/staff",
};

// Badge colours; the labels come from listingStatus.* translations.
const STATUS: Record<ListingStatus, { className: string }> = {
  draft: { className: "bg-foreground/5 text-foreground/60" },
  pending_verification: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  published: { className: "bg-verified/10 text-verified" },
  rejected: { className: "bg-red-500/10 text-red-600" },
  rented: { className: "bg-foreground/5 text-foreground/60" },
  sold: { className: "bg-foreground/5 text-foreground/60" },
  archived: { className: "bg-red-500/10 text-red-600" },
};

const PANELS = ["meetings", "transactions", "wallet"] as const;

// One dashboard for every customer account — the same person can rent, buy, let, and sell.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string; ticket?: string; kind?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const staffPath = STAFF_DASHBOARD[session.user.role];
  if (staffPath) redirect(staffPath);

  const params = await searchParams;
  const t = await getT();
  const { users, properties, tickets } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const [found, listings, unreadReplies] = await Promise.all([
    users.findOne({ _id: userId }),
    properties.find({ landlordId: userId }).sort({ createdAt: -1 }).toArray(),
    tickets.countDocuments({ userId, unreadReplyForUser: true }),
  ]);
  if (!found) redirect("/login");
  const user = await ensureReferralCode(found);

  const data = await loadDashboardData(session.user.id, listings, t);
  const savedListings = user.savedListingIds?.length
    ? await properties
        .find({ _id: { $in: user.savedListingIds }, status: "published" })
        .project<{ _id: ObjectId; title: string; priceNGN: number; listingType: string; photoUrls: string[]; location: { city: string } }>({
          title: 1,
          priceNGN: 1,
          listingType: 1,
          photoUrls: 1,
          location: 1,
        })
        .toArray()
    : [];
  const initialPanel = PANELS.find((p) => p === params.panel);
  const profileIncomplete = !user.profile?.profilePictureUrl || !user.profile?.dateOfBirth;

  // "Browse properties" lives in the navbar and "List a property" in the profile menu, so
  // the dashboard only keeps the account's own areas.
  const shortcuts = [
    {
      href: "/dashboard/landlord/candidates",
      label: t("dash.applications"),
      caption: t("dash.applicationsCaption"),
      icon: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9",
    },
    {
      href: "/dashboard/agreements",
      label: t("dash.agreements"),
      caption: t("dash.agreementsCaption"),
      icon: "M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6",
    },
    {
      href: "/dashboard/tenant/tickets",
      label: t("dash.messages"),
      caption: unreadReplies
        ? t(unreadReplies === 1 ? "dash.newReplyOne" : "dash.newReplies", { count: unreadReplies })
        : t("dash.messagesCaption"),
      icon: "M4 5h16v11H8l-4 4V5Zm4 5h8M8 8h5",
      badge: unreadReplies,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <IdentityHeader user={user} greeting={t("dash.welcome")} />

      {(!user.verifiedBadge || profileIncomplete) && (
        <div className="mt-4 flex flex-col gap-2">
          {!user.verifiedBadge && (
            <Link
              href="/dashboard/verify-identity"
              className="flex items-center justify-between gap-3 rounded-2xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm hover:border-clay/60"
            >
              <span>
                <span className="font-medium">{t("dash.verify")}</span>
                <span className="block text-xs text-foreground/60">{t("dash.verifyHint")}</span>
              </span>
              <span className="shrink-0 text-clay">→</span>
            </Link>
          )}
          {profileIncomplete && (
            <Link
              href="/dashboard/settings#profile"
              className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm hover:border-clay/50"
            >
              <span>
                <span className="font-medium">{t("dash.completeProfile")}</span>
                <span className="block text-xs text-foreground/60">{t("dash.completeProfileHint")}</span>
              </span>
              <span className="shrink-0 text-clay">→</span>
            </Link>
          )}
        </div>
      )}

      <nav className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {shortcuts.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group relative flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-clay/50 hover:shadow-md sm:p-5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay/10 text-clay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d={link.icon} />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold sm:text-base">{link.label}</span>
              <span className="mt-0.5 block text-[11px] text-foreground/50 sm:text-xs">{link.caption}</span>
            </span>
            {link.badge ? (
              <span className="absolute top-3 right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1.5 text-[11px] font-semibold text-white">
                {link.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <section className="mt-4">
        <DashboardPanels
          initialPanel={initialPanel}
          initialTicketId={params.ticket}
          initialKind={params.kind === "inspection" ? "inspection" : params.kind === "meeting" ? "meeting" : undefined}
          events={data.events}
          bookable={data.bookable}
          ledger={data.ledger}
          walletBalanceNGN={user.walletBalanceNGN ?? 0}
          referralCode={user.referralCode}
          earnings={data.earnings}
          withdrawals={data.withdrawals}
          hasBankDetails={Boolean(user.bankDetails?.accountNumber)}
        />
      </section>

      {savedListings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t("dash.saved")}</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedListings.map((saved) => (
              <Link
                key={saved._id.toString()}
                href={`/listings/${saved._id}`}
                className="flex gap-3 rounded-2xl border border-line p-3 hover:border-clay/50"
              >
                {saved.photoUrls[0] && (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                  <img src={saved.photoUrls[0]} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{saved.title}</span>
                  <span className="block text-xs text-foreground/60">
                    ₦{saved.priceNGN.toLocaleString()}
                    {saved.listingType === "rent" ? "/yr" : ""} · {saved.location.city}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {t("dash.yourProperties")}
            {listings.length > 0 && <span className="ml-1.5 font-normal text-foreground/50">{listings.length}</span>}
          </h2>
          {listings.length > 0 && (
            <Link href="/dashboard/landlord/listings/new" className="text-sm font-medium text-clay hover:underline">
              + {t("dash.listAnother")}
            </Link>
          )}
        </div>
        {listings.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay/10 text-clay" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-6 w-6">
                <path d="M3 11l9-7 9 7v10H3V11Zm6 10v-6h6v6" />
              </svg>
            </span>
            <p className="mt-3 font-medium">{t("dash.noProperty")}</p>
            <p className="mt-1 max-w-sm text-sm text-foreground/60">
              {t("dash.noPropertyBody")}
            </p>
            <Link
              href="/dashboard/landlord/listings/new"
              className="mt-4 flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
            >
              {t("dash.listAProperty")}
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line">
            {listings.map((listing) => {
              const status = STATUS[listing.status];
              const v = listing.verification;
              return (
                <div key={listing._id!.toString()} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      {listing.photoUrls[0] && (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                        <img src={listing.photoUrls[0]} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0">
                        <Link href={`/listings/${listing._id}`} className="font-medium break-words hover:text-clay">
                          {listing.title}
                        </Link>
                        <p className="text-xs text-foreground/60">
                          {t(listing.listingType === "rent" ? "listing.forRent" : "listing.forSale")} · ₦{listing.priceNGN.toLocaleString()}
                          {listing.listingType === "rent" ? t("listing.perYear") : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}>
                      {t(`listingStatus.${listing.status}` as MessageKey)}
                    </span>
                  </div>

                  {listing.status === "pending_verification" && !v.scheduledFor && (
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("dash.agentWillCall")}
                    </p>
                  )}

                  {listing.status === "pending_verification" && v.scheduledFor && (
                    <div className="mt-2 text-xs">
                      <p className="text-foreground/70">
                        {t(v.landlordResponse === "confirmed" ? "dash.visitConfirmedFor" : "dash.visitProposedFor")}{" "}
                        <span className="font-medium">{formatLagos(v.scheduledFor)}</span>
                      </p>
                      {v.landlordResponse === "declined" ? (
                        <p className="mt-1 text-foreground/60">
                          {t("dash.askedDifferentTime")}
                        </p>
                      ) : v.landlordResponse !== "confirmed" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <form action={confirmVerificationInspection}>
                            <input type="hidden" name="listingId" value={listing._id!.toString()} />
                            <button type="submit" className="h-8 rounded-full bg-clay px-3.5 text-xs font-medium text-white">
                              {t("dash.confirmTime")}
                            </button>
                          </form>
                          <form action={declineVerificationInspection}>
                            <input type="hidden" name="listingId" value={listing._id!.toString()} />
                            <button type="submit" className="h-8 rounded-full border border-line px-3.5 text-xs font-medium">
                              {t("dash.needDifferentTime")}
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {listing.status === "archived" && (
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("dash.takenDown")}
                      {listing.takenDown?.note ? `: ${listing.takenDown.note}` : "."} {t("dash.takenDownContact")}
                    </p>
                  )}

                  {(listing.status === "draft" || listing.status === "rejected") && (
                    <div className="mt-3">
                      {listing.status === "rejected" && v.rejectionReason && (
                        <p className="mb-2 text-xs text-red-600">{t("dash.rejected", { reason: v.rejectionReason })}</p>
                      )}
                      <ProposeInspectionForm listingId={listing._id!.toString()} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
