import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { notifications, tickets } = await getCollections();
  const mine = await notifications
    .find({ userId: new ObjectId(session.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  await notifications.updateMany(
    { userId: new ObjectId(session.user.id), read: false },
    { $set: { read: true } },
  );

  // Which dashboard a ticket-linked notification should open in depends on which side of
  // THAT SPECIFIC ticket this user is on, not their account's role — one account can be
  // the applicant on one ticket and the listing's landlord on another. Batch-fetch the
  // referenced tickets to tell them apart.
  const ticketIds = mine.filter((n) => n.ticketId).map((n) => n.ticketId!);
  const relatedTickets = ticketIds.length ? await tickets.find({ _id: { $in: ticketIds } }).toArray() : [];
  const ticketById = new Map(relatedTickets.map((t) => [t._id!.toString(), t]));

  function ticketPathFor(ticketId: string): string {
    if (isStaffRole(session!.user.role)) return `/dashboard/support/tickets/${ticketId}`;
    const ticket = ticketById.get(ticketId);
    const isApplicant = ticket?.userId.toString() === session!.user.id;
    return isApplicant ? `/dashboard/tenant/tickets/${ticketId}` : `/dashboard/landlord/tickets/${ticketId}`;
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      {mine.length === 0 && <p className="mt-8 text-foreground/70">Nothing yet.</p>}

      <div className="mt-8 flex flex-col gap-3">
        {mine.map((notification) => {
          const href = notification.ticketId
            ? ticketPathFor(notification.ticketId.toString())
            : notification.listingId
              ? `/listings/${notification.listingId}`
              : "/dashboard";

          return (
            <Link
              key={notification._id!.toString()}
              href={href}
              className={`rounded-lg border p-4 ${notification.read ? "border-line" : "border-clay"}`}
            >
              <p className="font-medium">{notification.title}</p>
              <p className="mt-1 text-sm text-foreground/70">{notification.body}</p>
              <p className="mt-1 text-xs text-foreground/50">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
