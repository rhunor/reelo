import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifyIdForm } from "@/components/verify-id-form";
import { VerifiedBadge } from "@/components/verified-badge";
import { getT } from "@/lib/i18n/server";

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
  const pendingWith =
    user.nin.status === "pending" ? "NIN" : user.driversLicence?.status === "pending" ? "driver's licence" : null;
  const t = await getT();
  const idName = (which: string | null) => (which === "NIN" ? t("id.nin.label") : t("id.drivers_licence.label"));

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-clay">
        ← {t("nav.dashboard")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{t("dash.verify")}</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {t("id.intro")}
      </p>

      {!verifiedWith && pendingWith ? (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">{t("id.received", { id: idName(pendingWith) })}</p>
          <p className="mt-1 text-foreground/70">
            {t("id.receivedBody")}
          </p>
        </div>
      ) : verifiedWith ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-verified/40 bg-verified/5 p-4">
          <VerifiedBadge label={t("id.verifiedBadge")} />
          <span className="text-sm text-foreground/70">{t("id.verifiedWith", { id: idName(verifiedWith) })}</span>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-line p-5">
          {lastFailed && (
            <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              {t("id.lastFailed")}{" "}
              <Link href="/dashboard/tenant/tickets/new" className="underline">
                {t("dash.messages")}
              </Link>
            </p>
          )}
          <VerifyIdForm defaultType={user.driversLicence?.status === "failed" && user.nin.status !== "failed" ? "drivers_licence" : "nin"} />
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-foreground/50">
        {t("id.footnote")}
      </p>
    </div>
  );
}
