import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { canContactReelo } from "@/lib/subscription-tiers";

const schema = z.object({
  subject: z.string().min(3),
  message: z.string().min(5),
  listingId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "tenant" && session.user.role !== "landlord")) {
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

  const { users, tickets } = await getCollections();

  // Listing inquiries are the paid "contact" feature; general support tickets are free
  // for any authenticated tenant or landlord.
  if (session.user.role === "tenant" && parsed.data.listingId) {
    const user = await users.findOne({ _id: new ObjectId(session.user.id) });
    if (!user || !canContactReelo(user.subscription.tier)) {
      return NextResponse.json(
        { error: "Upgrade to Pro or Pro+ to contact Reelo about a listing" },
        { status: 403 },
      );
    }
  }

  const now = new Date();
  const { insertedId } = await tickets.insertOne({
    userId: new ObjectId(session.user.id),
    userRole: session.user.role,
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

  return NextResponse.json({ success: true, id: insertedId.toString() });
}
