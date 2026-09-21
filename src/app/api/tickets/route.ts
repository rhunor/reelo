import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifyNewTicket } from "@/lib/notifications";
import { isStaffRole } from "@/lib/roles";

const schema = z.object({
  subject: z.string().min(3),
  message: z.string().min(5),
  listingId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (parsed.data.listingId && !ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const { tickets, users } = await getCollections();

  // A listing-scoped ticket is "applying" to a specific property, so it requires
  // verification the same way booking an inspection does — a general support question
  // (no listingId) never needs it.
  if (parsed.data.listingId) {
    const user = await users.findOne({ _id: new ObjectId(session.user.id) });
    if (!user?.verifiedBadge) {
      return NextResponse.json(
        { error: "Verify your identity before contacting Reallow about a listing" },
        { status: 403 },
      );
    }
  }

  const now = new Date();
  // isStaffRole was already checked above, so this is guaranteed "tenant" | "landlord" —
  // the cast just makes that explicit to the type checker.
  const userRole = session.user.role as "tenant" | "landlord";
  const { insertedId } = await tickets.insertOne({
    userId: new ObjectId(session.user.id),
    userRole,
    listingId: parsed.data.listingId ? new ObjectId(parsed.data.listingId) : undefined,
    subject: parsed.data.subject,
    status: "open",
    messages: [
      {
        senderId: new ObjectId(session.user.id),
        senderRole: session.user.role,
        body: parsed.data.message,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  });

  const ticket = await tickets.findOne({ _id: insertedId });
  if (ticket) await notifyNewTicket(ticket);

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
