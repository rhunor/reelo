import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z.object({ body: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  const { tickets } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const isOwner = ticket.userId.toString() === session.user.id;
  const isStaff = session.user.role === "admin" || session.user.role === "support";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Not your ticket" }, { status: 403 });
  }

  const now = new Date();

  await tickets.updateOne(
    { _id: ticket._id },
    {
      $push: {
        messages: {
          senderId: new ObjectId(session.user.id),
          senderRole: session.user.role,
          body: parsed.data.body,
          createdAt: now,
        },
      },
      $set: {
        updatedAt: now,
        status: isStaff ? "in_progress" : "open",
      },
    },
  );

  return NextResponse.json({ success: true });
}
