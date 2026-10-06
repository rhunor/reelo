import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifyIdForm } from "@/components/verify-id-form";
import { VerifiedBadge } from "@/components/verified-badge";

export const dynamic = "force-dynamic";

export default async function VerifyIdentityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!user) redirect("/login");

  const verifiedWith =
    user.nin.status === "verified" ? "NIN" : user.driversLicence?.status === "verified" ? "driver's licence" : null;
  const lastFailed = user.nin.status === "failed" || user.driversLicence?.status === "failed";

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-clay">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Verify your identity</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Verify with your <strong>NIN</strong> or your <strong>driver&apos;s licence</strong> — either one is enough. It&apos;s
        needed to apply for a property, book an inspection, or have a property you&apos;ve listed published.
      </p>

      {verifiedWith ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-verified/40 bg-verified/5 p-4">
          <VerifiedBadge label="Verified" />
          <span className="text-sm text-foreground/70">Your identity is verified with your {verifiedWith}.</span>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-line p-5">
          {lastFailed && (
            <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              Your last attempt didn&apos;t match. Check the number, and make sure the name on your account is your legal
              name — or{" "}
              <Link href="/dashboard/tenant/tickets/new" className="underline">
                contact Reallow
              </Link>
              .
            </p>
          )}
          <VerifyIdForm defaultType={user.driversLicence?.status === "failed" && user.nin.status !== "failed" ? "drivers_licence" : "nin"} />
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-foreground/50">
        We check your ID against official government records through our verification partner, Dojah. The name on your ID
        must match the name on your Reallow account (and your date of birth, if you&apos;ve added it). Your ID number is
        never shown to other users, and one ID can only verify one account.
      </p>
    </div>
  );
}
