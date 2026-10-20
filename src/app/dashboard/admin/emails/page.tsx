import Link from "next/link";
import { getCollections } from "@/lib/db";
import { formatLagos } from "@/lib/time";
import { AUDIENCES } from "@/lib/email-campaigns";
import { EmailCampaignForm } from "@/components/email-campaign-form";

export const dynamic = "force-dynamic";

// Admin → Email users: mass emails through Resend from no-reply@reallow.co, plus a log of
// everything sent.
export default async function AdminEmailsPage() {
  const { emailCampaigns } = await getCollections();
  const history = await emailCampaigns.find({}).sort({ createdAt: -1 }).limit(50).toArray();
  const label = (id: string) => AUDIENCES.find((a) => a.id === id)?.label ?? id;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Email users</h1>
      <p className="mt-1 mb-6 text-sm text-foreground/60">
        Sent from no-reply@reallow.co with the Reallow logo. Send yourself a test first.
      </p>

      <EmailCampaignForm audiences={AUDIENCES} />

      <h2 className="mt-10 text-lg font-semibold">Sent emails</h2>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/50">Nothing sent yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line">
          {history.map((c) => (
            <li key={c._id!.toString()} className="p-4 text-sm">
              <p className="font-medium break-words">{c.subject}</p>
              <p className="mt-0.5 text-xs text-foreground/60">
                {formatLagos(c.createdAt)} · {label(c.audience)}
                {c.verifiedOnly ? " (verified only)" : ""} · sent {c.sent.toLocaleString()} of {c.recipients.toLocaleString()}
                {c.failed ? ` · ${c.failed} failed` : ""} · by {c.sentByName ?? "an admin"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
