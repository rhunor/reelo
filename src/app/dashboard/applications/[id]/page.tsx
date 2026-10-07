import Link from "next/link";
import { canActAsLandlord } from "@/lib/reallow-landlord";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifiedBadge } from "@/components/verified-badge";
import { PreferCandidateButton } from "@/components/prefer-candidate-button";
import { ReportButton } from "@/components/report-button";
import { UserAvatar } from "@/components/user-avatar";
import { formatLagos } from "@/lib/time";
import { redactContactInfo } from "@/lib/contact-guard";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const EMPLOYMENT: Record<string, MessageKey> = {
  student: "profile.student",
  self_employed: "profile.selfEmployed",
  employed: "profile.employed",
};

// What a landlord sees when they open an application: only what the applicant chose to
// make visible on their profile (each field has its own toggle), plus verification status,
// which always shows. Phone, email, address, date of birth, and bank details never do.
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ObjectId.isValid(id)) notFound();

  const { tickets, properties, users } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket?.listingId) notFound();
  const listing = await properties.findOne({ _id: ticket.listingId });
  if (!listing || !(await canActAsLandlord(listing.landlordId, session.user))) notFound();
  // An admin reviewing on behalf of Reallow (the listing's owner), not the landlord themselves.
  const onBehalfOfReallow = listing.landlordId.toString() !== session.user.id;

  const applicant = await users.findOne({ _id: ticket.userId });
  if (!applicant) notFound();

  const p = applicant.profile ?? {};
  const t = await getT();
  // Stored choices (gender, marital status) have translated labels; free text stays as typed.
  const choice = (value?: string) => (value ? t(`profile.${value}` as MessageKey) : undefined);
  const tp = applicant.tenantProfile?.visibleToLandlords ? applicant.tenantProfile : undefined;
  const decision = ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined);
  const sharesAnything = Boolean(
    (p.profilePictureVisible && p.profilePictureUrl) ||
      (p.occupationVisible && p.occupation) ||
      (p.employmentStatusVisible && p.employmentStatus) ||
      (p.genderVisible && p.gender) ||
      (p.stateOfOriginVisible && p.stateOfOrigin) ||
      (p.maritalStatusVisible && p.maritalStatus) ||
      (p.religionVisible && p.religion) ||
      tp,
  );
  // Name only shows once they've chosen to share something about themselves.
  const displayName = sharesAnything ? (applicant.firstName ?? applicant.name.split(" ")[0]!) : t("app.applicant");

  const fields: Array<[string, string | undefined]> = [
    [t("profile.employmentStatus"), p.employmentStatusVisible && EMPLOYMENT[p.employmentStatus ?? ""] ? t(EMPLOYMENT[p.employmentStatus ?? ""]!) : undefined],
    [t("profile.occupation"), p.occupationVisible ? p.occupation : undefined],
    [t("profile.gender"), p.genderVisible ? choice(p.gender) : undefined],
    [t("profile.stateOfOrigin"), p.stateOfOriginVisible ? p.stateOfOrigin : undefined],
    [t("profile.maritalStatus"), p.maritalStatusVisible ? choice(p.maritalStatus) : undefined],
    [t("profile.religion"), p.religionVisible ? p.religion : undefined],
    [t("app.employer"), tp?.employer],
    [t("app.monthlyIncome"), tp?.monthlyIncomeNGN !== undefined ? `₦${tp.monthlyIncomeNGN.toLocaleString()}` : undefined],
    [t("app.householdSize"), tp?.householdSize !== undefined ? String(tp.householdSize) : undefined],
    [t("app.pets"), tp?.hasPets === undefined ? undefined : t(tp.hasPets ? "common.yes" : "common.no")],
  ];
  const shownFields = fields.filter(([, value]) => value);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href={onBehalfOfReallow ? "/dashboard/admin/applications" : "/dashboard/landlord/candidates"}
        className="text-sm text-foreground/60 hover:text-clay"
      >
        ← {t("app.all")}
      </Link>
      {onBehalfOfReallow && (
        <p className="mt-3 rounded-xl border border-clay/30 bg-clay/5 px-3 py-2 text-xs">
          {t("app.onBehalf")}
        </p>
      )}

      <p className="mt-6 text-xs text-foreground/50">
        {t("app.applicationFor")}{" "}
        <Link href={`/listings/${listing._id}`} className="underline">
          {listing.title}
        </Link>{" "}
        · {formatLagos(ticket.createdAt)}
      </p>

      <div className="mt-3 flex items-center gap-4 rounded-2xl border border-line p-5">
        <UserAvatar
          name={displayName}
          pictureUrl={p.profilePictureVisible ? p.profilePictureUrl : undefined}
          size={64}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{displayName}</h1>
            {applicant.verifiedBadge ? (
              <VerifiedBadge />
            ) : (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">{t("app.notVerified")}</span>
            )}
          </div>
          {applicant.ratingCount ? (
            <p className="mt-0.5 text-xs text-foreground/60">
              ★ {t(applicant.ratingCount === 1 ? "app.ratingOne" : "app.rating", { avg: applicant.ratingAverage!.toFixed(1), count: applicant.ratingCount })}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-4 rounded-2xl border border-line p-5">
        <h2 className="text-sm font-semibold">{t("app.shared")}</h2>
        {shownFields.length === 0 && !tp?.aboutMe ? (
          <p className="mt-2 text-sm text-foreground/50">{t("app.sharedNone")}</p>
        ) : (
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {shownFields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-foreground/50">{label}</dt>
                <dd className="mt-0.5 capitalize">{redactContactInfo(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {tp?.aboutMe && <p className="mt-4 text-sm text-foreground/80">{redactContactInfo(tp.aboutMe)}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-line p-5">
        <h2 className="text-sm font-semibold">{t("app.decision")}</h2>
        <p className="mt-1 mb-3 text-xs text-foreground/60">{t("app.decisionHint")}</p>
        <PreferCandidateButton ticketId={ticket._id!.toString()} decision={decision} />
        {decision === "approved" && onBehalfOfReallow && (
          <p className="mt-4 text-xs text-foreground/60">
            The applicant can now book a meeting. Their requests appear in{" "}
            <Link href="/dashboard/admin/applications" className="text-clay underline">
              Admin → Applications
            </Link>{" "}
            for you to accept, decline or reschedule.
          </p>
        )}
        {decision === "approved" && !onBehalfOfReallow && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/dashboard?panel=meetings&ticket=${ticket._id}`}
              className="flex h-9 items-center rounded-full bg-clay px-4 text-sm font-medium text-white"
            >
              {t("meetings.bookMeeting")}
            </Link>
          </div>
        )}
      </section>

      <div className="mt-4">
        <ReportButton targetType="user" targetId={applicant._id!.toString()} label={t("report.applicant")} />
      </div>
    </div>
  );
}
