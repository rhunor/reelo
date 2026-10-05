import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Awaiting signatures",
  signed_by_landlord: "Signed by landlord",
  signed_by_tenant: "Signed by tenant",
  fully_signed: "Fully signed",
};

export default async function AgreementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Tenancy agreements</h1>

      {mine.length === 0 && <p className="mt-8 text-foreground/60">No agreements yet.</p>}

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
                  {titleById.get(agreement.listingId.toString()) ?? "Property"}
                </span>
                <span className="block text-xs text-foreground/60">
                  {asLandlord ? "You're the landlord" : "You're the tenant"} · ₦{agreement.terms.rentNGN.toLocaleString()}/year
                </span>
              </span>
              <span className="shrink-0 text-right text-xs">
                <span className="block text-foreground/70">{ended ? "Ended" : STATUS_LABEL[agreement.status]}</span>
                {agreement.payment.status === "paid_to_reallow" && (
                  <span className="text-clay">{asLandlord ? "Payout pending" : "Paid"}</span>
                )}
                {agreement.payment.status === "paid_out_to_landlord" && <span className="text-verified">Paid out</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
