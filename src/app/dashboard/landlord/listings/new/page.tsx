import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { NewListingForm } from "@/components/new-listing-form";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Read fresh from the DB, not session.user.verifiedBadge — the session is a snapshot
  // from login time, so someone who verified afterwards would still see the warning.
  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  const isVerified = Boolean(user?.verifiedBadge);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">List a property</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Free to list. It won&apos;t appear on the site until Reallow completes the in-person
        verification inspection you propose a date for below and approves it.
      </p>

      {!isVerified && (
        <div className="mt-4 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm">
          <p className="font-medium">Your identity isn&apos;t verified yet</p>
          <p className="mt-1 text-foreground/70">
            You can still list now, but Reallow won&apos;t schedule the verification inspection
            until your identity is verified (NIN or driver&apos;s licence) — worth doing in parallel.
          </p>
          <Link href="/dashboard/verify-identity" className="mt-2 inline-block text-clay underline">
            Verify now
          </Link>
        </div>
      )}

      <NewListingForm />
    </div>
  );
}
