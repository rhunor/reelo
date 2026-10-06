import Link from "next/link";
import { ensureReferralCode } from "@/lib/referrals";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { loadDashboardData } from "@/lib/dashboard-data";
import { formatLagos } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
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

const STATUS: Record<ListingStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-foreground/5 text-foreground/60" },
  pending_verification: { label: "Awaiting verification", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  published: { label: "Live", className: "bg-verified/10 text-verified" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600" },
  rented: { label: "Rented", className: "bg-foreground/5 text-foreground/60" },
  sold: { label: "Sold", className: "bg-foreground/5 text-foreground/60" },
  archived: { label: "Taken down", className: "bg-red-500/10 text-red-600" },
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

  const data = await loadDashboardData(session.user.id, listings);
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

  const shortcuts = [
    { href: "/dashboard/landlord/listings/new", label: t("nav.listProperty"), primary: true },
    { href: "/listings", label: t("dash.browse") },
    { href: "/dashboard/landlord/candidates", label: t("dash.applications") },
    { href: "/dashboard/agreements", label: t("dash.agreements") },
    { href: "/dashboard/tenant/tickets", label: t("dash.messages"), badge: unreadReplies },
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

      <section className="mt-6">
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

      <nav className="mt-6 flex flex-wrap gap-2">
        {shortcuts.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.primary
                ? "flex h-9 items-center rounded-full bg-clay px-4 text-sm font-medium text-white hover:opacity-90"
                : "flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-clay hover:text-clay"
            }
          >
            {link.label}
            {"badge" in link && link.badge ? (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1.5 text-[11px] font-semibold text-white">
                {link.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

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

      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t("dash.yourProperties")}</h2>
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
                          {listing.listingType === "rent" ? "For rent" : "For sale"} · ₦{listing.priceNGN.toLocaleString()}
                          {listing.listingType === "rent" ? "/yr" : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  {listing.status === "pending_verification" && !v.scheduledFor && (
                    <p className="mt-2 text-xs text-foreground/60">
                      A Reallow agent will call you to book the in-person verification visit.
                    </p>
                  )}

                  {listing.status === "pending_verification" && v.scheduledFor && (
                    <div className="mt-2 text-xs">
                      <p className="text-foreground/70">
                        Verification visit {v.landlordResponse === "confirmed" ? "confirmed" : "proposed"} for{" "}
                        <span className="font-medium">{formatLagos(v.scheduledFor)}</span>
                      </p>
                      {v.landlordResponse === "declined" ? (
                        <p className="mt-1 text-foreground/60">
                          You asked for a different time — a Reallow agent will call you to rearrange.
                        </p>
                      ) : v.landlordResponse !== "confirmed" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <form action={confirmVerificationInspection}>
                            <input type="hidden" name="listingId" value={listing._id!.toString()} />
                            <button type="submit" className="h-8 rounded-full bg-clay px-3.5 text-xs font-medium text-white">
                              Confirm this time
                            </button>
                          </form>
                          <form action={declineVerificationInspection}>
                            <input type="hidden" name="listingId" value={listing._id!.toString()} />
                            <button type="submit" className="h-8 rounded-full border border-line px-3.5 text-xs font-medium">
                              I need a different time
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {listing.status === "archived" && (
                    <p className="mt-2 text-xs text-foreground/60">
                      Taken down by Reallow{listing.takenDown?.note ? `: ${listing.takenDown.note}` : "."} Contact Reallow if
                      you have questions.
                    </p>
                  )}

                  {(listing.status === "draft" || listing.status === "rejected") && (
                    <div className="mt-3">
                      {listing.status === "rejected" && v.rejectionReason && (
                        <p className="mb-2 text-xs text-red-600">Rejected: {v.rejectionReason}</p>
                      )}
                      <ProposeInspectionForm listingId={listing._id!.toString()} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
