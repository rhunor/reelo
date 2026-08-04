import Link from "next/link";
import type { SupportTicket } from "@/types/models";

export function TicketList({ tickets, basePath }: { tickets: SupportTicket[]; basePath: string }) {
  if (tickets.length === 0) {
    return <p className="mt-8 text-foreground/70">No messages yet.</p>;
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {tickets.map((ticket) => (
        <Link
          key={ticket._id!.toString()}
          href={`${basePath}/${ticket._id}`}
          className="flex items-center justify-between rounded-lg border border-line p-4"
        >
          <div>
            <p className="font-medium">{ticket.subject}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {ticket.messages.length} message{ticket.messages.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="text-sm capitalize text-foreground/50">{ticket.status.replace("_", " ")}</span>
        </Link>
      ))}
    </div>
  );
}
