import Link from "next/link";
import { getT, getLocale } from "@/lib/i18n/server";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { confirmVerificationInspection, declineVerificationInspection } from "@/app/dashboard/admin/actions";

export const dynamic = "force-dynamic";

// Where the "confirm your verification visit" email lands. The email's two buttons only
// bring the landlord here (?response=confirm|decline highlights which they picked); the
// actual confirm/decline still happens with a click on the site, behind login. The same
// buttons also appear on the landlord dashboard, so this page is never the only way in.
export default async function VerificationVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ response?: string }>;
}) {
  const { id } = await params;
  const { response: intent } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect(`/login`);
  if (!ObjectId.isValid(id)) notFound();

  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(id) });
  if (!listing || listing.landlordId.toString() !== session.user.id) notFound();

  const { verification } = listing;
  const t = await getT();
  const locale = await getLocale();
  const when = verification.scheduledFor ? new Date(verification.scheduledFor) : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("visit.eyebrow")}</p>
      <h1 className="mt-2 text-2xl font-semibold break-words">{listing.title}</h1>
      {listing.fullAddress && <p className="mt-1 text-sm text-foreground/70 break-words">{listing.fullAddress}</p>}

      {listing.status !== "pending_verification" ? (
        <p className="mt-6 text-sm text-foreground/70">{t("visit.noLongerPending")}</p>
      ) : !when ? (
        <p className="mt-6 text-sm text-foreground/70">
          {t("visit.notScheduled")}
        </p>
      ) : (
        <div className="mt-6 rounded-lg border border-line p-5">
          <p className="text-sm text-foreground/60">{t("visit.scheduledFor")}</p>
          <p className="mt-1 text-lg font-semibold">
            {when.toLocaleString(locale === "en" || locale === "urh" ? "en-NG" : `${locale}-NG`, {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "Africa/Lagos",
            })}
          </p>

          {verification.landlordResponse === "confirmed" ? (
            <p className="mt-4 text-sm font-medium text-verified">
              {t("visit.confirmed")}
            </p>
          ) : verification.landlordResponse === "declined" ? (
            <p className="mt-4 text-sm text-foreground/70">
              {t("dash.askedDifferentTime")}
            </p>
          ) : (
            <>
              {intent === "decline" && (
                <p className="mt-4 text-sm text-foreground/70">
                  {t("visit.needDifferent")}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={confirmVerificationInspection}>
                  <input type="hidden" name="listingId" value={listing._id!.toString()} />
                  <button
                    type="submit"
                    className={`h-10 rounded-full px-5 text-sm font-medium ${
                      intent === "decline" ? "border border-line" : "bg-clay text-white"
                    }`}
                  >
                    {t("dash.confirmTime")}
                  </button>
                </form>
                <form action={declineVerificationInspection}>
                  <input type="hidden" name="listingId" value={listing._id!.toString()} />
                  <button
                    type="submit"
                    className={`h-10 rounded-full px-5 text-sm font-medium ${
                      intent === "decline" ? "bg-clay text-white" : "border border-line"
                    }`}
                  >
                    {t("dash.needDifferentTime")}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      <Link href="/dashboard" className="mt-6 inline-block text-sm text-clay underline">
        {t("visit.back")}
      </Link>
    </div>
  );
}
