import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notificationHref, notificationText } from "@/lib/notification-links";
import { getT } from "@/lib/i18n/server";

// Feeds the navbar's notification dropdown — the latest few, each with its resolved link.
// `?count=1` returns just the unread count: the cheap call the bell polls every few seconds
// so new notifications appear without a page refresh.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notifications, tickets } = await getCollections();
  const userId = new ObjectId(session.user.id);
  if (new URL(request.url).searchParams.get("count")) {
    const [unreadCount, newest] = await Promise.all([
      notifications.countDocuments({ userId, read: false }),
      notifications.findOne({ userId }, { sort: { createdAt: -1 }, projection: { createdAt: 1 } }),
    ]);
    return NextResponse.json(
      { unreadCount, newestAt: newest?.createdAt ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const [latest, unreadCount] = await Promise.all([
    notifications.find({ userId }).sort({ createdAt: -1 }).limit(15).toArray(),
    notifications.countDocuments({ userId, read: false }),
  ]);

  const ticketIds = latest.filter((n) => n.ticketId && !n.href).map((n) => n.ticketId!);
  const related = ticketIds.length ? await tickets.find({ _id: { $in: ticketIds } }).toArray() : [];
  const ticketById = new Map(related.map((t) => [t._id!.toString(), t]));
  const viewer = { id: session.user.id, role: session.user.role };
  const t = await getT();

  return NextResponse.json({
    unreadCount,
    notifications: latest.map((n) => ({
      id: n._id!.toString(),
      ...notificationText(n, t),
      href: notificationHref(n, viewer, ticketById),
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
}

// Marks everything read — called when the dropdown is opened.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notifications } = await getCollections();
  await notifications.updateMany({ userId: new ObjectId(session.user.id), read: false }, { $set: { read: true } });
  return NextResponse.json({ success: true });
}
