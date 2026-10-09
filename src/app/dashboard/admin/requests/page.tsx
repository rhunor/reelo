import Link from "next/link";
import { getCollections } from "@/lib/db";
import { formatLagos } from "@/lib/time";
import { DISTRICTS_BY_STATE, SUPPORTED_STATES, type SupportedState } from "@/lib/locations";
import { SubmitButton } from "@/components/submit-button";
import { updatePropertyRequest } from "../actions";
import type { PropertyRequestStatus } from "@/types/models";

export const dynamic = "force-dynamic";

const TABS: { id: PropertyRequestStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "matched", label: "Matched" },
  { id: "closed", label: "Closed" },
];

const STATUS_STYLE: Record<PropertyRequestStatus, string> = {
  new: "bg-clay/10 text-clay",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  matched: "bg-verified/10 text-verified",
  closed: "bg-foreground/5 text-foreground/60",
};

// "Not finding what you want?" requests from /listings — people asking Reallow's agents to
// find them a property. Also a read on demand Reallow has no listings for yet.
export default async function AdminPropertyRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusParam } = await searchParams;
  const status = TABS.find((tab) => tab.id === statusParam)?.id ?? "new";
  const { propertyRequests } = await getCollections();

  const [requests, counts] = await Promise.all([
    propertyRequests.find({ status }).sort({ createdAt: status === "new" ? 1 : -1 }).limit(200).toArray(),
    propertyRequests.aggregate<{ _id: PropertyRequestStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);
  const countOf = (id: PropertyRequestStatus) => counts.find((c) => c._id === id)?.count ?? 0;
  const stateLabel = (value: string) => SUPPORTED_STATES.find((s) => s.value === value)?.label ?? value;
  const districtLabel = (state: string, city?: string) =>
    city ? (DISTRICTS_BY_STATE[state as SupportedState]?.find((d) => d.value === city)?.label ?? city) : "Anywhere";

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Property requests</h1>
      <p className="mt-1 text-sm text-foreground/60">
        People who couldn&apos;t find what they wanted on Reallow and asked our agents to look for them.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/admin/requests?status=${tab.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              tab.id === status ? "border-transparent bg-clay text-white" : "border-line hover:border-clay hover:text-clay"
            }`}
          >
            {tab.label} <span className="tabular-nums opacity-70">({countOf(tab.id)})</span>
          </Link>
        ))}
      </nav>

      {requests.length === 0 && <p className="mt-6 text-sm text-foreground/50">Nothing here.</p>}

      <div className="mt-6 flex flex-col gap-4">
        {requests.map((r) => (
          <article key={r._id!.toString()} className="rounded-2xl border border-line p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.propertyType} for {r.listingType === "rent" ? "rent" : "sale"}
                </p>
                <p className="mt-0.5 text-sm text-foreground/70">
                  {districtLabel(r.state, r.city)}, {stateLabel(r.state)}
                  {r.maxBudgetNGN ? ` · up to ₦${r.maxBudgetNGN.toLocaleString()}${r.listingType === "rent" ? "/yr" : ""}` : ""}
                  {r.bedrooms !== undefined ? ` · ${r.bedrooms}+ bedrooms` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[r.status]}`}>
                {TABS.find((tab) => tab.id === r.status)?.label}
              </span>
            </div>

            {r.details && <p className="mt-3 rounded-lg bg-foreground/5 p-3 text-sm whitespace-pre-line break-words">{r.details}</p>}

            <p className="mt-3 text-sm">
              {r.userId ? (
                <Link href={`/dashboard/admin/users/${r.userId}`} className="font-medium hover:text-clay">
                  {r.name}
                </Link>
              ) : (
                <span className="font-medium">
                  {r.name} <span className="text-xs font-normal text-foreground/50">(guest)</span>
                </span>
              )}
              {r.phone && (
                <>
                  {" · "}
                  <a href={`tel:${r.phone}`} className="text-clay hover:underline">
                    {r.phone}
                  </a>
                </>
              )}
              {r.email && (
                <>
                  {" · "}
                  <a href={`mailto:${r.email}`} className="text-clay hover:underline">
                    {r.email}
                  </a>
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Requested {formatLagos(r.createdAt)}
              {r.updatedAt.getTime() !== r.createdAt.getTime() && ` · updated ${formatLagos(r.updatedAt)}`}
            </p>

            <form action={updatePropertyRequest} className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-start">
              <input type="hidden" name="requestId" value={r._id!.toString()} />
              <select name="status" defaultValue={r.status} className="h-9 rounded-md border border-line bg-transparent px-2 text-sm">
                {TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <input
                name="note"
                defaultValue={r.adminNote}
                maxLength={1000}
                placeholder="Note (e.g. called, sent 2 options in Wuse)"
                className="h-9 min-w-0 flex-1 rounded-md border border-line bg-transparent px-3 text-sm"
              />
              <SubmitButton className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white">Save</SubmitButton>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
