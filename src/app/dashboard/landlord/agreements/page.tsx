import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LandlordAgreementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { agreements } = await getCollections();
  const mine = await agreements
    .find({ landlordId: new ObjectId(session.user.id) })
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
            <span className="flex items-center gap-2 text-sm capitalize text-foreground/50">
              {agreement.status.replace(/_/g, " ")}
              {agreement.payment.status === "paid_to_reallow" && (
                <span className="rounded-full bg-clay/10 px-2 py-0.5 text-xs font-medium text-clay">
                  payout pending
                </span>
              )}
              {agreement.payment.status === "paid_out_to_landlord" && (
                <span className="rounded-full bg-verified/10 px-2 py-0.5 text-xs font-medium text-verified">
                  paid out
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
