import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifyNewApplication, notifyNewTicket } from "@/lib/notifications";
import { isStaffRole } from "@/lib/roles";

// "Apply for this property" — one tap, no free text. The landlord only ever sees the
// applicant's verification status and the profile details they've made visible (see
// /dashboard/applications/[id]); the two never get each other's contact details or a way
// to message each other. The application is still a ticket, so the applicant can talk to
// Reallow about it.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Log in to apply" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const { properties, tickets, users } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const [listing, user] = await Promise.all([
    properties.findOne({ _id: new ObjectId(id) }),
    users.findOne({ _id: userId }),
  ]);
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ error: "This property isn't available" }, { status: 404 });
  }
  if (listing.landlordId.equals(userId)) {
    return NextResponse.json({ error: "You can't apply for your own property" }, { status: 400 });
  }
  if (!user?.verifiedBadge) {
    return NextResponse.json({ error: "Verify your identity before applying" }, { status: 403 });
  }
  if (await tickets.findOne({ userId, listingId: listing._id })) {
    return NextResponse.json({ error: "You've already applied for this property" }, { status: 409 });
  }

  const now = new Date();
  const ticket = {
    userId,
    userRole: "user" as const,
    listingId: listing._id!,
    subject: `Application for ${listing.title}`,
    status: "open" as const,
    messages: [
      {
        senderId: userId,
        senderRole: session.user.role,
        body: "Applied for this property through Reallow.",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await tickets.insertOne(ticket);
  await properties.updateOne({ _id: listing._id }, { $inc: { inquiriesCount: 1 } });

  await notifyNewTicket({ ...ticket, _id: insertedId });
  await notifyNewApplication({ ...ticket, _id: insertedId }, listing);

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
