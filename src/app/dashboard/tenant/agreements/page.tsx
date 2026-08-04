import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TenantAgreementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { agreements } = await getCollections();
  const mine = await agreements
    .find({ tenantId: new ObjectId(session.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Your tenancy agreements</h1>

      {mine.length === 0 && (
        <p className="mt-8 text-foreground/70">No agreements yet.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {mine.map((agreement) => (
          <Link
            key={agreement._id!.toString()}
            href={`/agreements/${agreement._id}`}
            className="flex items-center justify-between rounded-lg border border-line p-4"
          >
            <p className="text-sm">₦{agreement.terms.rentNGN.toLocaleString()}/year</p>
            <span className="text-sm capitalize text-foreground/50">{agreement.status.replace(/_/g, " ")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
