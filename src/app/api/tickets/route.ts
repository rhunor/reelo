import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifyMessageReceived, notifyNewTicket } from "@/lib/notifications";
import { isStaffRole } from "@/lib/roles";
import { sendMessageReceivedEmail, sendSupportInboxEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { FAQ_TOPICS, topicLabel } from "@/lib/faqs";

const schema = z.object({
  subject: z.string().min(3),
  message: z.string().min(5),
  listingId: z.string().optional(),
  topic: z.string().max(40).optional(),
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
  // Applying for a property goes through the one-tap Apply button
  // (api/listings/[id]/apply) — no free-text message ever reaches the landlord.
  if (parsed.data.listingId) {
    return NextResponse.json({ error: "Use the Apply button on the listing" }, { status: 400 });
  }

  const { tickets, users } = await getCollections();

  const now = new Date();
  const userRole = "user" as const;
  const { insertedId } = await tickets.insertOne({
    userId: new ObjectId(session.user.id),
    userRole,
    topic: FAQ_TOPICS.some((t) => t.id === parsed.data.topic) ? parsed.data.topic : undefined,
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
  if (ticket) {
    await notifyNewTicket(ticket);
    // Messages to Reallow also land in Reallow's inbox, and the sender gets an email
    // receipt alongside the in-app one.
    const sender = await users.findOne({ _id: ticket.userId });
    if (sender) {
      await sendSupportInboxEmail({
        supportEmail: SUPPORT_EMAIL,
        fromName: sender.name,
        fromEmail: sender.email,
        fromPhone: sender.phone,
        topic: topicLabel(ticket.topic),
        subject: ticket.subject,
        message: parsed.data.message,
        ticketId: ticket._id!.toString(),
      });
      await sendMessageReceivedEmail(sender.email, sender.firstName ?? sender.name, ticket.subject, ticket._id!.toString());
      await notifyMessageReceived(ticket);
    }
  }

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
