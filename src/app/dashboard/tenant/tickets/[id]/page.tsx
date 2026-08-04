import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { TicketMessages } from "@/components/ticket-messages";
import { ReplyForm } from "@/components/reply-form";

export const dynamic = "force-dynamic";

export default async function TenantTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ObjectId.isValid(id)) notFound();

  const { tickets } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket || ticket.userId.toString() !== session.user.id) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
      <p className="mt-1 text-sm capitalize text-foreground/50">{ticket.status.replace("_", " ")}</p>
      <TicketMessages messages={ticket.messages} />
      <ReplyForm ticketId={ticket._id!.toString()} />
    </div>
  );
}
