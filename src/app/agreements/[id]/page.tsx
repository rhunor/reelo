import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { SignAgreementForm } from "@/components/sign-agreement-form";
import { ReviewForm } from "@/components/review-form";
import { AgreementPayButton } from "@/components/agreement-pay-button";
import { markAgreementPaidOut } from "@/app/dashboard/admin/actions";

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
  const showTenantProfile = tenant?.tenantProfile?.visibleToLandlords && (isLandlordParty || isStaff);
  const myReview =
    isLandlordParty || isTenantParty
      ? await reviews.findOne({ agreementId: agreement._id, fromUserId: new ObjectId(session.user.id) })
      : null;

  const party: "landlord" | "tenant" | null = isLandlordParty ? "landlord" : isTenantParty ? "tenant" : null;
  const hasSignedAsParty = party ? agreement.signatures.some((s) => s.party === party) : false;

  const termMonths =
    typeof agreement.terms.leaseEndOrTermMonths === "number"
      ? `${agreement.terms.leaseEndOrTermMonths} months`
      : new Date(agreement.terms.leaseEndOrTermMonths).toLocaleDateString();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Tenancy agreement</h1>
      {listing && <p className="mt-1 text-foreground/70">{listing.title}</p>}
      <p className="mt-1 text-sm font-medium">{STATUS_LABEL[agreement.status]}</p>

      <div className="mt-6 rounded-lg border border-line p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-foreground/50">Rent</dt>
            <dd className="mt-1 font-medium">₦{agreement.terms.rentNGN.toLocaleString()}/year</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Deposit</dt>
            <dd className="mt-1 font-medium">₦{agreement.terms.depositNGN.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Lease start</dt>
            <dd className="mt-1 font-medium">{new Date(agreement.terms.leaseStart).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Term</dt>
            <dd className="mt-1 font-medium">{termMonths}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <p className="text-foreground/50 text-sm">Responsibilities</p>
          <p className="mt-1 text-sm break-words">{agreement.terms.responsibilities}</p>
        </div>
      </div>

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
            <p className="mt-3 text-sm text-foreground/70 break-words">{tenant.tenantProfile.aboutMe}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 text-sm">
        {(["landlord", "tenant"] as const).map((p) => {
          const signature = agreement.signatures.find((s) => s.party === p);
          return (
            <p key={p} className="capitalize">
              {p}: {signature ? `signed ${new Date(signature.signedAt).toLocaleString()}` : "not yet signed"}
            </p>
          );
        })}
      </div>

      {party && !hasSignedAsParty && agreement.status !== "fully_signed" && (
        <SignAgreementForm agreementId={agreement._id!.toString()} />
      )}

      {agreement.status === "fully_signed" && (
        <>
          <p className="mt-6 text-sm text-foreground/70">
            Both parties have signed. Use your browser&apos;s print/save-as-PDF to keep a copy of
            this page.
          </p>

          <div className="mt-6 rounded-lg border border-line p-4">
            <p className="text-sm font-medium">Rent &amp; deposit</p>
            <p className="mt-1 text-xs text-foreground/50">
              Paid straight to Reallow, never directly to the landlord — Reallow holds it and pays
              the landlord out separately.
            </p>

            {agreement.payment.status === "unpaid" && isTenantParty && (
              <div className="mt-3">
                <AgreementPayButton
                  agreementId={agreement._id!.toString()}
                  amountNGN={agreement.terms.rentNGN + agreement.terms.depositNGN}
                />
              </div>
            )}
            {agreement.payment.status === "unpaid" && !isTenantParty && (
              <p className="mt-3 text-sm text-foreground/70">Awaiting payment from the tenant.</p>
            )}

            {agreement.payment.status === "paid_to_reallow" && (
              <>
                <p className="mt-3 text-sm text-verified">
                  Reallow received ₦{agreement.payment.amountNGN?.toLocaleString()}
                  {agreement.payment.paidAt &&
                    ` on ${new Date(agreement.payment.paidAt).toLocaleDateString()}`}{" "}
                  — held pending payout to the landlord.
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
  );
}
