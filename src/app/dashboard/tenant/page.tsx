import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  const tierConfig = SUBSCRIPTION_TIERS[user?.subscription.tier ?? "free"];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Tenant dashboard</h1>

      <div className="mt-6 rounded-lg border border-line p-4">
        <p className="text-sm text-foreground/70">Plan</p>
        <p className="mt-1 font-medium">{tierConfig.label}</p>
        {tierConfig.inspectionBookingLimit !== null && (
          <p className="mt-1 text-sm text-foreground/70">
            {user?.subscription.inspectionBookingsUsed ?? 0} of {tierConfig.inspectionBookingLimit}{" "}
            inspection bookings used this month
          </p>
        )}
        {user?.ratingCount ? (
          <p className="mt-1 text-sm text-foreground/70">
            Your trust score: {user.ratingAverage!.toFixed(1)}/5 from {user.ratingCount} review
            {user.ratingCount === 1 ? "" : "s"}
          </p>
        ) : null}
        <Link href="/pricing" className="mt-2 inline-block text-sm underline">
          Manage plan
        </Link>
      </div>

      <div className="mt-6 flex gap-4 text-sm">
        <Link href="/dashboard/tenant/tickets" className="underline">
          Your messages to Reallow
        </Link>
        <Link href="/dashboard/tenant/agreements" className="underline">
          Tenancy agreements
        </Link>
        <Link href="/listings" className="underline">
          Browse listings
        </Link>
      </div>
    </div>
  );
}
