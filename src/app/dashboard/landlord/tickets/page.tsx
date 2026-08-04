import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { TicketList } from "@/components/ticket-list";

export const dynamic = "force-dynamic";

export default async function LandlordTicketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tickets } = await getCollections();
  const myTickets = await tickets
    .find({ userId: new ObjectId(session.user.id) })
    .sort({ updatedAt: -1 })
    .toArray();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your messages to Reelo</h1>
        <Link
          href="/dashboard/landlord/tickets/new"
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium leading-10 text-white"
        >
          New message
        </Link>
      </div>
      <TicketList tickets={myTickets} basePath="/dashboard/landlord/tickets" />
    </div>
  );
}
