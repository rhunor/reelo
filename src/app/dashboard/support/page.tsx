import Link from "next/link";
import { getCollections } from "@/lib/db";
import { DashboardHeader, StatGrid, AccountSettingsLink } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage() {
  const { tickets } = await getCollections();
  const [openTickets, inProgressCount, resolvedCount] = await Promise.all([
    tickets.find({ status: { $in: ["open", "in_progress"] } }).sort({ updatedAt: -1 }).toArray(),
    tickets.countDocuments({ status: "in_progress" }),
    tickets.countDocuments({ status: "resolved" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <DashboardHeader
        eyebrow="Support"
        title="Support queue"
        subtitle={`${openTickets.length} ticket${openTickets.length === 1 ? "" : "s"} needing attention.`}
      />

      <StatGrid
        stats={[
          { label: "Needing attention", value: openTickets.length, accent: openTickets.length > 0 ? "amber" : undefined },
          { label: "In progress", value: inProgressCount, accent: inProgressCount > 0 ? "clay" : undefined },
          { label: "Resolved", value: resolvedCount },
        ]}
      />

      <div className="mt-6">
        <AccountSettingsLink />
      </div>

      {openTickets.length === 0 && (
        <p className="mt-8 text-foreground/70">Nothing open right now.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {openTickets.map((ticket) => (
          <Link
            key={ticket._id!.toString()}
            href={`/dashboard/support/tickets/${ticket._id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-line p-4"
          >
            <div className="min-w-0">
              <p className="font-medium break-words">{ticket.subject}</p>
              <p className="mt-1 text-sm text-foreground/70">
                From a {ticket.userRole}
                {ticket.listingId ? " · about a listing" : ""}
              </p>
            </div>
            <span className="shrink-0 text-sm capitalize text-foreground/50">
              {ticket.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
