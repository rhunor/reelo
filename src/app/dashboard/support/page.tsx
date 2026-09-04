import Link from "next/link";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage() {
  const { tickets } = await getCollections();
  const openTickets = await tickets
    .find({ status: { $in: ["open", "in_progress"] } })
    .sort({ updatedAt: -1 })
    .toArray();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Support queue</h1>
      <p className="mt-2 text-foreground/70">
        {openTickets.length} ticket{openTickets.length === 1 ? "" : "s"} needing attention.
      </p>

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
