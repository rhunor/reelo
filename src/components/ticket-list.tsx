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
          className="flex items-center justify-between gap-3 rounded-lg border border-line p-4"
        >
          <div className="min-w-0">
            <p className="font-medium break-words">{ticket.subject}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {ticket.messages.length} message{ticket.messages.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="shrink-0 text-sm capitalize text-foreground/50">
            {ticket.status.replace("_", " ")}
          </span>
        </Link>
      ))}
    </div>
  );
}
