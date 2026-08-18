import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifyNinForm } from "@/components/verify-nin-form";
import { VerifiedBadge } from "@/components/verified-badge";

export const dynamic = "force-dynamic";

export default async function VerifyIdentityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });

  const isTenant = session.user.role === "tenant";
  const isLandlord = session.user.role === "landlord";

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Verify your identity</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Reallow verifies every account against the National Identity Number (NIN) database via
        Youverify.
        {isTenant && " You'll need this before you can book an inspection."}
        {isLandlord && " You'll need this before you can list a property."}
      </p>

      {user?.verifiedBadge ? (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-line p-4">
          <VerifiedBadge label="Verified" />
          <span className="text-sm text-foreground/60">
            Verified {user.nin.verifiedAt ? new Date(user.nin.verifiedAt).toLocaleDateString() : ""}
          </span>
        </div>
      ) : (
        <>
          {user?.nin.status === "failed" && (
            <p className="mt-4 text-sm text-red-600">
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
  );
}
