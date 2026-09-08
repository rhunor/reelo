import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifyNinForm } from "@/components/verify-nin-form";
import { VerifyBvnForm } from "@/components/verify-bvn-form";
import { VerifiedBadge } from "@/components/verified-badge";

export const dynamic = "force-dynamic";

export default async function VerifyIdentityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });

  const isTenant = session.user.role === "tenant";
  const isLandlord = session.user.role === "landlord";
  const ninVerified = user?.nin.status === "verified";
  const bvnVerified = user?.bvn?.status === "verified";

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Verify your identity</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Reallow verifies every account against the National Identity Number (NIN) and Bank
        Verification Number (BVN) databases via Youverify — both are required.
        {isTenant && " You'll need this before you can apply for a listing or book an inspection."}
        {isLandlord && " You'll need this before you can list a property."}
      </p>

      {user?.verifiedBadge && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-line p-4">
          <VerifiedBadge label="Verified" />
          <span className="text-sm text-foreground/60">NIN and BVN both verified</span>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">National Identification Number (NIN)</p>
          {ninVerified && <VerifiedBadge label="Verified" />}
        </div>
        {!ninVerified && (
          <>
            {user?.nin.status === "failed" && (
              <p className="mt-2 text-sm text-red-600">
                Your last attempt didn&apos;t match — check the number and try again, or{" "}
                <a href={`/dashboard/${isLandlord ? "landlord" : "tenant"}/tickets/new`} className="underline">
                  contact Reallow
                </a>{" "}
                if this keeps happening.
              </p>
            )}
            <VerifyNinForm />
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-line p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Bank Verification Number (BVN)</p>
          {bvnVerified && <VerifiedBadge label="Verified" />}
        </div>
        {!bvnVerified && (
          <>
            {user?.bvn?.status === "failed" && (
              <p className="mt-2 text-sm text-red-600">
                Your last attempt didn&apos;t match — check the number and try again, or{" "}
                <a href={`/dashboard/${isLandlord ? "landlord" : "tenant"}/tickets/new`} className="underline">
                  contact Reallow
                </a>{" "}
                if this keeps happening.
              </p>
            )}
            <VerifyBvnForm />
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-foreground/50">
        The name on your NIN, BVN, bank account, and profile must all match — Reallow won&apos;t
        pay out to a name that doesn&apos;t correspond with your verified identity.
      </p>
    </div>
  );
}
