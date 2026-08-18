import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TenantNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { notifications } = await getCollections();
  const mine = await notifications
    .find({ userId: new ObjectId(session.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  await notifications.updateMany(
    { userId: new ObjectId(session.user.id), read: false },
    { $set: { read: true } },
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      {mine.length === 0 && <p className="mt-8 text-foreground/70">Nothing yet.</p>}

      <div className="mt-8 flex flex-col gap-3">
        {mine.map((notification) => (
          <Link
            key={notification._id!.toString()}
            href={notification.listingId ? `/listings/${notification.listingId}` : "/dashboard/tenant"}
            className={`rounded-lg border p-4 ${notification.read ? "border-line" : "border-clay"}`}
          >
            <p className="font-medium">{notification.title}</p>
            <p className="mt-1 text-sm text-foreground/70">{notification.body}</p>
            <p className="mt-1 text-xs text-foreground/50">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
