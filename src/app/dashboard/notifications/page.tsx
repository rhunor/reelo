import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notificationHref, notificationText } from "@/lib/notification-links";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getT();

  const { notifications, tickets } = await getCollections();
  const mine = await notifications
    .find({ userId: new ObjectId(session.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  await notifications.updateMany(
    { userId: new ObjectId(session.user.id), read: false },
    { $set: { read: true } },
  );

  const ticketIds = mine.filter((n) => n.ticketId && !n.href).map((n) => n.ticketId!);
  const relatedTickets = ticketIds.length ? await tickets.find({ _id: { $in: ticketIds } }).toArray() : [];
  const ticketById = new Map(relatedTickets.map((ticket) => [ticket._id!.toString(), ticket]));
  const viewer = { id: session.user.id, role: session.user.role };

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">{t("notif.title")}</h1>

      {mine.length === 0 && <p className="mt-8 text-foreground/70">{t("notif.empty")}</p>}

      <div className="mt-8 flex flex-col gap-3">
        {mine.map((notification) => {
          const href = notificationHref(notification, viewer, ticketById);
          const text = notificationText(notification, t);

          return (
            <Link
              key={notification._id!.toString()}
              href={href}
              className={`rounded-lg border p-4 ${notification.read ? "border-line" : "border-clay"}`}
            >
              <p className="font-medium">{text.title}</p>
              <p className="mt-1 text-sm text-foreground/70">{text.body}</p>
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
