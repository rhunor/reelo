import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifiedBadge } from "@/components/verified-badge";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Tenant dashboard</h1>
        {user?.verifiedBadge && <VerifiedBadge />}
      </div>

      {!user?.verifiedBadge && (
        <div className="mt-4 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm">
          <p className="font-medium">Verify your identity</p>
          <p className="mt-1 text-foreground/70">
            You can browse and contact Reallow without verifying, but you&apos;ll need to verify
            before booking an inspection.
          </p>
          <Link href="/dashboard/verify-identity" className="mt-2 inline-block text-clay underline">
            Verify now
          </Link>
        </div>
      )}

      {user?.ratingCount ? (
        <p className="mt-6 text-sm text-foreground/70">
          Your trust score: {user.ratingAverage!.toFixed(1)}/5 from {user.ratingCount} review
          {user.ratingCount === 1 ? "" : "s"}
        </p>
      ) : null}

      <div className="mt-6 flex gap-4 text-sm">
        <Link href="/dashboard/tenant/tickets" className="underline">
          Your messages to Reallow
        </Link>
        <Link href="/dashboard/tenant/agreements" className="underline">
          Tenancy agreements
        </Link>
        <Link href="/dashboard/tenant/profile" className="underline">
          Your profile
        </Link>
        <Link href="/listings" className="underline">
          Browse listings
        </Link>
      </div>
    </div>
  );
}
