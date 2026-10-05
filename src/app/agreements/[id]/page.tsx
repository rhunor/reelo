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

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Awaiting signatures",
  signed_by_landlord: "Signed by landlord — awaiting tenant",
  signed_by_tenant: "Signed by tenant — awaiting landlord",
  fully_signed: "Fully signed",
};

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      ? `${agreement.terms.leaseEndOrTermMonths} month${agreement.terms.leaseEndOrTermMonths === 1 ? "" : "s"}`
      : new Date(agreement.terms.leaseEndOrTermMonths).toLocaleDateString();

  const paymentBreakdown = computeAgreementTotal(agreement.terms);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Tenancy agreement</h1>
          {listing && <p className="mt-1 text-foreground/70">{listing.title}</p>}
          <p className="mt-1 text-sm font-medium">
            {STATUS_LABEL[agreement.status]} · {termMonths}
          </p>
        </div>
        <PrintButton />
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
          <p className="text-sm font-medium">About the tenant</p>
          <p className="mt-1 text-xs text-foreground/50">
            Shared by the tenant — visible to you because they chose to share it.
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {tenant.tenantProfile.occupation && (
              <div>
                <dt className="text-foreground/50">Occupation</dt>
                <dd className="mt-0.5">{tenant.tenantProfile.occupation}</dd>
              </div>
            )}
            {tenant.tenantProfile.employer && (
              <div>
                <dt className="text-foreground/50">Employer</dt>
                <dd className="mt-0.5">{tenant.tenantProfile.employer}</dd>
              </div>
            )}
            {tenant.tenantProfile.monthlyIncomeNGN !== undefined && (
              <div>
                <dt className="text-foreground/50">Monthly income</dt>
                <dd className="mt-0.5">₦{tenant.tenantProfile.monthlyIncomeNGN.toLocaleString()}</dd>
              </div>
            )}
            {tenant.tenantProfile.householdSize !== undefined && (
              <div>
                <dt className="text-foreground/50">Household size</dt>
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
            Both parties have signed. Use &quot;Print / save as PDF&quot; above to keep a copy.
          </p>

          <div className="mt-6 rounded-lg border border-line p-4">
            <p className="text-sm font-medium">Rent &amp; deposit</p>
            <p className="mt-1 text-xs text-foreground/50">
              Paid straight to Reallow, never directly to the landlord — Reallow holds it and pays
              the landlord out separately.
            </p>

            {agreement.payment.status === "unpaid" && isTenantParty && (
              <div className="mt-3 flex flex-col gap-3">
                <PaymentBreakdown
                  lines={[
                    { label: "Rent", amountNGN: paymentBreakdown.priceNGN },
                    ...(paymentBreakdown.cautionFeeNGN > 0
                      ? [{ label: "Caution fee", amountNGN: paymentBreakdown.cautionFeeNGN }]
                      : []),
                    ...(paymentBreakdown.estateChargeNGN > 0
                      ? [{ label: "Estate charge", amountNGN: paymentBreakdown.estateChargeNGN }]
                      : []),
                    {
                      label: `Reallow service charge (${formatRate(paymentBreakdown.serviceChargeRate)})`,
                      amountNGN: paymentBreakdown.serviceChargeNGN,
                    },
                  ]}
                  totalNGN={paymentBreakdown.totalNGN}
                />
                <AgreementPayButton
                  agreementId={agreement._id!.toString()}
                  amountNGN={paymentBreakdown.totalNGN}
                  walletBalanceNGN={viewerWalletNGN}
                />
              </div>
            )}
            {agreement.payment.status === "unpaid" && !isTenantParty && (
              <p className="mt-3 text-sm text-foreground/70">Awaiting payment from the tenant.</p>
            )}

            {agreement.payment.status === "paid_to_reallow" && (
              <>
                <p className="mt-3 text-sm text-verified">
                  Reallow received ₦{agreement.payment.amountNGN?.toLocaleString()} in total
                  {agreement.payment.paidAt &&
                    ` on ${new Date(agreement.payment.paidAt).toLocaleDateString()}`}
                  .
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  Landlord&apos;s portion — rent, caution fee, and estate charge only, not the
                  service charge — is{" "}
                  <span className="font-medium">₦{paymentBreakdown.toOwnerNGN.toLocaleString()}</span>
                  , held pending payout.
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
                Paid out to the landlord
                {agreement.payment.payoutAt &&
                  ` on ${new Date(agreement.payment.payoutAt).toLocaleDateString()}`}
                .
              </p>
            )}
          </div>

          {agreement.payment.status !== "unpaid" && (
            <div className="mt-6 rounded-lg border border-line p-4">
              <p className="text-sm font-medium">Ending the tenancy</p>
              <p className="mt-1 text-xs text-foreground/50">
                Let Reallow know when the tenancy ends. Continuing past the lease term is between
                you and the other party — Reallow doesn&apos;t need to be told unless one of you is
                ending it.
              </p>
              <div className="mt-3 flex flex-col gap-1 text-sm">
                <p>
                  Landlord:{" "}
                  {agreement.terminatedByLandlord
                    ? `ended ${new Date(agreement.terminatedByLandlordAt!).toLocaleDateString()}`
                    : "tenancy ongoing"}
                </p>
                <p>
                  Tenant:{" "}
                  {agreement.terminatedByTenant
                    ? `ended ${new Date(agreement.terminatedByTenantAt!).toLocaleDateString()}`
                    : "tenancy ongoing"}
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
              Reviews open once rent &amp; deposit have been paid.
            </p>
          )}
          {party && agreement.payment.status !== "unpaid" && !myReview && (
            <ReviewForm
              agreementId={agreement._id!.toString()}
              revieweeLabel={party === "landlord" ? "tenant" : "landlord"}
            />
          )}
          {party && agreement.payment.status !== "unpaid" && myReview && (
            <p className="mt-4 text-sm text-foreground/70">
              You rated {party === "landlord" ? "the tenant" : "the landlord"} {myReview.rating}/5.
            </p>
          )}
        </>
      )}
      </div>
    </div>
  );
}
