import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { SignAgreementForm } from "@/components/sign-agreement-form";
import { ReviewForm } from "@/components/review-form";

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

  const { agreements, properties, reviews } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(id) });
  if (!agreement) notFound();

  const isStaff = session.user.role === "admin" || session.user.role === "support";
  const isLandlordParty = agreement.landlordId.toString() === session.user.id;
  const isTenantParty = agreement.tenantId.toString() === session.user.id;
  if (!isStaff && !isLandlordParty && !isTenantParty) notFound();

  const listing = await properties.findOne({ _id: agreement.listingId });
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
        <dl className="grid grid-cols-2 gap-4 text-sm">
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
          <p className="mt-1 text-sm">{agreement.terms.responsibilities}</p>
        </div>
      </div>

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
          {party && !myReview && (
            <ReviewForm
              agreementId={agreement._id!.toString()}
              revieweeLabel={party === "landlord" ? "tenant" : "landlord"}
            />
          )}
          {myReview && (
            <p className="mt-4 text-sm text-foreground/70">
              You rated {party === "landlord" ? "the tenant" : "the landlord"} {myReview.rating}/5.
            </p>
          )}
        </>
      )}
    </div>
  );
}
