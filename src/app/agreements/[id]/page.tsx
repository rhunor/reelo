import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { SignAgreementForm } from "@/components/sign-agreement-form";
import { ReviewForm } from "@/components/review-form";
import { AgreementPayButton } from "@/components/agreement-pay-button";
import { TerminateAgreementButton } from "@/components/terminate-agreement-button";
import { PaymentBreakdown } from "@/components/payment-breakdown";
import { TenancyAgreementDocument } from "@/components/tenancy-agreement-document";
import { PrintButton } from "@/components/print-button";
import { redactContactInfo } from "@/lib/contact-guard";
import { markAgreementPaidOut } from "@/app/dashboard/admin/actions";
import { computeAgreementTotal, formatRate } from "@/lib/fees";
import { getLocale, getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const locale = await getLocale();
  const date = (value: Date | string) => new Date(value).toLocaleDateString(locale === "en" ? "en-NG" : locale);
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ObjectId.isValid(id)) notFound();

  const { agreements, properties, reviews, users } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(id) });
  if (!agreement) notFound();

  const isStaff = session.user.role === "admin" || session.user.role === "support";
  const isLandlordParty = agreement.landlordId.toString() === session.user.id;
  const isTenantParty = agreement.tenantId.toString() === session.user.id;
  if (!isStaff && !isLandlordParty && !isTenantParty) notFound();

  const listing = await properties.findOne({ _id: agreement.listingId });
  const tenant = isLandlordParty || isStaff ? await users.findOne({ _id: agreement.tenantId }) : null;
  const viewerWalletNGN = isTenantParty
    ? ((await users.findOne({ _id: agreement.tenantId }, { projection: { walletBalanceNGN: 1 } }))?.walletBalanceNGN ?? 0)
    : 0;

  // Snapshotted values win; agreements created before snapshots existed fall back to
  // live lookups so they still render a complete document.
  const needsLiveNames = !agreement.terms.landlordName || !agreement.terms.tenantName;
  const [liveLandlord, liveTenant] = needsLiveNames
    ? await Promise.all([
        users.findOne({ _id: agreement.landlordId }),
        users.findOne({ _id: agreement.tenantId }),
      ])
    : [null, null];
  const documentLandlordName = agreement.terms.landlordName ?? liveLandlord?.name ?? "The Landlord";
  const documentTenantName = agreement.terms.tenantName ?? liveTenant?.name ?? "The Tenant";
  const documentAddress =
    agreement.terms.propertyAddress ??
    (listing
      ? listing.fullAddress ||
        [listing.location.area, listing.location.city, listing.location.state].filter(Boolean).join(", ")
      : "the property");
  const documentHouseRules = agreement.terms.houseRules ?? listing?.dealBreakers ?? [];
  const showTenantProfile = tenant?.tenantProfile?.visibleToLandlords && (isLandlordParty || isStaff);
  const myReview =
    isLandlordParty || isTenantParty
      ? await reviews.findOne({ agreementId: agreement._id, fromUserId: new ObjectId(session.user.id) })
      : null;

  const party: "landlord" | "tenant" | null = isLandlordParty ? "landlord" : isTenantParty ? "tenant" : null;
  const hasSignedAsParty = party ? agreement.signatures.some((s) => s.party === party) : false;

  const termMonths =
    typeof agreement.terms.leaseEndOrTermMonths === "number"
      ? t(agreement.terms.leaseEndOrTermMonths === 1 ? "form.monthOne" : "form.months", {
          count: agreement.terms.leaseEndOrTermMonths,
        })
      : date(agreement.terms.leaseEndOrTermMonths);

  const paymentBreakdown = computeAgreementTotal(agreement.terms);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">{t("agreement.heading")}</h1>
          {listing && <p className="mt-1 text-foreground/70">{listing.title}</p>}
          <p className="mt-1 text-sm font-medium">
            {t(`agreement.page.${agreement.status}` as MessageKey)} · {termMonths}
          </p>
        </div>
        <PrintButton label={t("agreement.print")} />
      </div>

      <div className="mt-6 print:mt-0">
        <TenancyAgreementDocument
          agreement={agreement}
          landlordName={documentLandlordName}
          tenantName={documentTenantName}
          propertyAddress={documentAddress}
          propertyDescription={agreement.terms.propertyDescription}
          houseRules={documentHouseRules}
        />
      </div>

      <div className="print:hidden">
      {showTenantProfile && tenant?.tenantProfile && (
        <div className="mt-6 rounded-lg border border-line p-6">
          <p className="text-sm font-medium">{t("agreement.aboutTenant")}</p>
          <p className="mt-1 text-xs text-foreground/50">
            {t("agreement.aboutTenantNote")}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {tenant.tenantProfile.occupation && (
              <div>
                <dt className="text-foreground/50">{t("profile.occupation")}</dt>
                <dd className="mt-0.5">{tenant.tenantProfile.occupation}</dd>
              </div>
            )}
            {tenant.tenantProfile.employer && (
              <div>
                <dt className="text-foreground/50">{t("agreement.employer")}</dt>
                <dd className="mt-0.5">{tenant.tenantProfile.employer}</dd>
              </div>
            )}
            {tenant.tenantProfile.monthlyIncomeNGN !== undefined && (
              <div>
                <dt className="text-foreground/50">{t("agreement.monthlyIncome")}</dt>
                <dd className="mt-0.5">₦{tenant.tenantProfile.monthlyIncomeNGN.toLocaleString()}</dd>
              </div>
            )}
            {tenant.tenantProfile.householdSize !== undefined && (
              <div>
                <dt className="text-foreground/50">{t("agreement.householdSize")}</dt>
                <dd className="mt-0.5">{tenant.tenantProfile.householdSize}</dd>
              </div>
            )}
          </dl>
          {tenant.tenantProfile.aboutMe && (
            <p className="mt-3 text-sm text-foreground/70 break-words">{redactContactInfo(tenant.tenantProfile.aboutMe)}</p>
          )}
        </div>
      )}

      {party && !hasSignedAsParty && agreement.status !== "fully_signed" && (
        <SignAgreementForm agreementId={agreement._id!.toString()} />
      )}

      {agreement.status === "fully_signed" && (
        <>
          <p className="mt-6 text-sm text-foreground/70">
            {t("agreement.bothSigned")}
          </p>

          <div className="mt-6 rounded-lg border border-line p-4">
            <p className="text-sm font-medium">{t("agreement.rentDeposit")}</p>
            <p className="mt-1 text-xs text-foreground/50">
              {t("agreement.paidToReallow")}
            </p>

            {agreement.payment.status === "unpaid" && isTenantParty && (
              <div className="mt-3 flex flex-col gap-3">
                <PaymentBreakdown
                  lines={[
                    { label: t("txType.rent"), amountNGN: paymentBreakdown.priceNGN },
                    ...(paymentBreakdown.cautionFeeNGN > 0
                      ? [{ label: t("listing.cautionFee"), amountNGN: paymentBreakdown.cautionFeeNGN }]
                      : []),
                    ...(paymentBreakdown.estateChargeNGN > 0
                      ? [{ label: t("listing.estateCharge"), amountNGN: paymentBreakdown.estateChargeNGN }]
                      : []),
                    {
                      label: t("listing.serviceCharge", { rate: formatRate(paymentBreakdown.serviceChargeRate) }),
                      amountNGN: paymentBreakdown.serviceChargeNGN,
                    },
                  ]}
                  totalNGN={paymentBreakdown.totalNGN}
                  totalLabel={t("agreement.total")}
                />
                <AgreementPayButton
                  agreementId={agreement._id!.toString()}
                  amountNGN={paymentBreakdown.totalNGN}
                  walletBalanceNGN={viewerWalletNGN}
                  label={t("agreement.payVia", { amount: `₦${paymentBreakdown.totalNGN.toLocaleString()}` })}
                />
              </div>
            )}
            {agreement.payment.status === "unpaid" && !isTenantParty && (
              <p className="mt-3 text-sm text-foreground/70">{t("agreement.awaitingPayment")}</p>
            )}

            {agreement.payment.status === "paid_to_reallow" && (
              <>
                <p className="mt-3 text-sm text-verified">
                  {agreement.payment.paidAt
                    ? t("agreement.receivedOn", {
                        amount: `₦${agreement.payment.amountNGN?.toLocaleString() ?? 0}`,
                        date: date(agreement.payment.paidAt),
                      })
                    : t("agreement.received", { amount: `₦${agreement.payment.amountNGN?.toLocaleString() ?? 0}` })}
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  {t("agreement.landlordPortion", { amount: `₦${paymentBreakdown.toOwnerNGN.toLocaleString()}` })}
                </p>
                {session.user.role === "admin" && (
                  <form action={markAgreementPaidOut} className="mt-3">
                    <input type="hidden" name="agreementId" value={agreement._id!.toString()} />
                    <button
                      type="submit"
                      className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white"
                    >
                      Mark payout to landlord complete
                    </button>
                  </form>
                )}
              </>
            )}

            {agreement.payment.status === "paid_out_to_landlord" && (
              <p className="mt-3 text-sm text-verified">
                {agreement.payment.payoutAt
                  ? t("agreement.paidOutOn", { date: date(agreement.payment.payoutAt) })
                  : t("agreement.paidOutDone")}
              </p>
            )}
          </div>

          {agreement.payment.status !== "unpaid" && (
            <div className="mt-6 rounded-lg border border-line p-4">
              <p className="text-sm font-medium">{t("agreement.ending")}</p>
              <p className="mt-1 text-xs text-foreground/50">
                {t("agreement.endingNote")}
              </p>
              <div className="mt-3 flex flex-col gap-1 text-sm">
                <p>
                  {t("agreement.landlordLabel")}:{" "}
                  {agreement.terminatedByLandlord
                    ? t("agreement.endedOn", { date: date(agreement.terminatedByLandlordAt!) })
                    : t("agreement.ongoing")}
                </p>
                <p>
                  {t("agreement.tenantLabel")}:{" "}
                  {agreement.terminatedByTenant
                    ? t("agreement.endedOn", { date: date(agreement.terminatedByTenantAt!) })
                    : t("agreement.ongoing")}
                </p>
              </div>

              {party === "landlord" && !agreement.terminatedByLandlord && (
                <div className="mt-3">
                  <TerminateAgreementButton agreementId={agreement._id!.toString()} />
                </div>
              )}
              {party === "tenant" && !agreement.terminatedByTenant && (
                <div className="mt-3">
                  <TerminateAgreementButton agreementId={agreement._id!.toString()} />
                </div>
              )}
            </div>
          )}

          {party && agreement.payment.status === "unpaid" && (
            <p className="mt-4 text-sm text-foreground/50">
              {t("agreement.reviewsOpen")}
            </p>
          )}
          {party && agreement.payment.status !== "unpaid" && !myReview && (
            <ReviewForm
              agreementId={agreement._id!.toString()}
              reviewee={party === "landlord" ? "tenant" : "landlord"}
            />
          )}
          {party && agreement.payment.status !== "unpaid" && myReview && (
            <p className="mt-4 text-sm text-foreground/70">
              {t(party === "landlord" ? "agreement.youRatedTenant" : "agreement.youRatedLandlord", {
                rating: myReview.rating,
              })}
            </p>
          )}
        </>
      )}
      </div>
    </div>
  );
}
