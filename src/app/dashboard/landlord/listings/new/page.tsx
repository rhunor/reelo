import Link from "next/link";
import { getT } from "@/lib/i18n/server";
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
  const t = await getT();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">{t("dash.listAProperty")}</h1>
      <p className="mt-2 text-sm text-foreground/70">{t("newListing.intro")}</p>

      {!isVerified && (
        <div className="mt-4 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm">
          <p className="font-medium">{t("newListing.notVerified")}</p>
          <p className="mt-1 text-foreground/70">{t("newListing.notVerifiedBody")}</p>
          <Link href="/dashboard/verify-identity" className="mt-2 inline-block text-clay underline">
            {t("newListing.verifyNow")}
          </Link>
        </div>
      )}

      <NewListingForm />
    </div>
  );
}
