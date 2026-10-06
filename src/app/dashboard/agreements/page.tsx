import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, MessageKey> = {
  draft: "agreement.status.draft",
  sent: "agreement.status.sent",
  signed_by_landlord: "agreement.status.signed_by_landlord",
  signed_by_tenant: "agreement.status.signed_by_tenant",
  fully_signed: "agreement.status.fully_signed",
};

export default async function AgreementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getT();

  const userId = new ObjectId(session.user.id);
  const { agreements, properties } = await getCollections();
  const mine = await agreements
    .find({ $or: [{ landlordId: userId }, { tenantId: userId }] })
    .sort({ createdAt: -1 })
    .toArray();
  const listings = mine.length
    ? await properties.find({ _id: { $in: mine.map((a) => a.listingId) } }, { projection: { title: 1 } }).toArray()
    : [];
  const titleById = new Map(listings.map((l) => [l._id!.toString(), l.title]));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-clay">
        ← {t("nav.dashboard")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("agreement.title")}</h1>

      {mine.length === 0 && <p className="mt-8 text-foreground/60">{t("agreement.none")}</p>}

      <div className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line">
        {mine.map((agreement) => {
          const asLandlord = agreement.landlordId.equals(userId);
          const ended = agreement.terminatedByLandlord && agreement.terminatedByTenant;
          return (
            <Link
              key={agreement._id!.toString()}
              href={`/agreements/${agreement._id}`}
              className="flex items-center justify-between gap-3 p-4 hover:bg-foreground/5"
            >
              <span className="min-w-0">
                <span className="block font-medium break-words">
                  {titleById.get(agreement.listingId.toString()) ?? t("agreement.property")}
                </span>
                <span className="block text-xs text-foreground/60">
                  {t(asLandlord ? "agreement.youLandlord" : "agreement.youTenant")} · ₦{agreement.terms.rentNGN.toLocaleString()}
                  {t("listing.perYear")}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs">
                <span className="block text-foreground/70">{ended ? t("agreement.ended") : t(STATUS_LABEL[agreement.status]!)}</span>
                {agreement.payment.status === "paid_to_reallow" && (
                  <span className="text-clay">{t(asLandlord ? "agreement.payoutPending" : "tx.paid")}</span>
                )}
                {agreement.payment.status === "paid_out_to_landlord" && <span className="text-verified">{t("agreement.paidOut")}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
