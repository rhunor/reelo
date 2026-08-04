import Link from "next/link";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAgreementsPage() {
  const { agreements } = await getCollections();
  const all = await agreements.find({}).sort({ createdAt: -1 }).toArray();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenancy agreements</h1>
        <Link
          href="/dashboard/admin/agreements/new"
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium leading-10 text-white"
        >
          New agreement
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {all.map((agreement) => (
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
