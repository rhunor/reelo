import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { TicketMessages } from "@/components/ticket-messages";
import { ReplyForm } from "@/components/reply-form";
import { VerifiedBadge } from "@/components/verified-badge";
import { resolveTicket, reopenTicket } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const { tickets, users, properties } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket) notFound();

  const [fromUser, listing] = await Promise.all([
    users.findOne({ _id: ticket.userId }),
    ticket.listingId ? properties.findOne({ _id: ticket.listingId }) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold break-words">{ticket.subject}</h1>
      <div className="mt-1 flex items-center gap-2 text-sm text-foreground/70">
        <span>
          From {fromUser?.name ?? "a user"} ({ticket.userRole}, {fromUser?.email})
        </span>
        {fromUser?.verifiedBadge && <VerifiedBadge />}
      </div>
      {listing && (
        <p className="mt-1 text-sm text-foreground/70">
          Re: <span className="font-medium break-words">{listing.title}</span>
        </p>
      )}
      <p className="mt-1 text-sm capitalize text-foreground/50">{ticket.status.replace("_", " ")}</p>
      {ticket.landlordPreferred && (
        <p className="mt-1 text-sm font-medium text-verified">
          The landlord has marked this tenant as preferred.
        </p>
      )}

      <TicketMessages messages={ticket.messages} />
      <ReplyForm ticketId={ticket._id!.toString()} />

      <div className="mt-6">
        {ticket.status !== "resolved" ? (
          <form action={resolveTicket}>
            <input type="hidden" name="ticketId" value={ticket._id!.toString()} />
            <button
              type="submit"
              className="h-9 rounded-full border border-line px-4 text-sm font-medium"
            >
              Mark resolved
            </button>
          </form>
        ) : (
          <form action={reopenTicket}>
            <input type="hidden" name="ticketId" value={ticket._id!.toString()} />
            <button
              type="submit"
              className="h-9 rounded-full border border-line px-4 text-sm font-medium"
            >
              Reopen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
