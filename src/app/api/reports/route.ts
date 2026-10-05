import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifyNewReport } from "@/lib/notifications";
import { sendSupportInboxEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/contact-info";

const schema = z.object({
  targetType: z.enum(["user", "listing"]),
  targetId: z.string(),
  reason: z.string().min(3).max(200),
  details: z.string().max(1000).optional(),
});

// Any authenticated user can file a report — on another user (a landlord or tenant they've
// dealt with) or on a listing (e.g. one they suspect isn't the poster's to sell/rent). See
// src/app/dashboard/admin/reports/page.tsx for the review queue this feeds.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.targetId)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const { reports, users, properties } = await getCollections();
  const reporterId = new ObjectId(session.user.id);
  const targetId = new ObjectId(parsed.data.targetId);
  const target =
    parsed.data.targetType === "listing"
      ? await properties.findOne({ _id: targetId }, { projection: { title: 1 } })
      : await users.findOne({ _id: targetId }, { projection: { name: 1 } });
  if (!target) {
    return NextResponse.json({ error: "We couldn't find what you're reporting" }, { status: 404 });
  }
  if (await reports.findOne({ reporterId, targetId, status: { $in: ["open", "reviewing"] } })) {
    return NextResponse.json({ error: "You've already reported this — Reallow is looking into it" }, { status: 409 });
  }

  const report = {
    reporterId,
    targetType: parsed.data.targetType,
    targetId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    status: "open" as const,
    createdAt: new Date(),
  };
  const { insertedId } = await reports.insertOne(report);

  await notifyNewReport({ ...report, _id: insertedId });
  const reporter = await users.findOne({ _id: reporterId });
  const targetLabel = "title" in target ? `listing “${target.title}”` : `user ${"name" in target ? target.name : ""}`;
  await sendSupportInboxEmail({
    supportEmail: SUPPORT_EMAIL,
    fromName: reporter?.name ?? "A Reallow user",
    fromEmail: reporter?.email ?? SUPPORT_EMAIL,
    fromPhone: reporter?.phone,
    topic: "Report",
    subject: `Report on ${targetLabel}: ${parsed.data.reason}`,
    message: parsed.data.details || "(no extra details)",
  });

  return NextResponse.json({ success: true });
}
