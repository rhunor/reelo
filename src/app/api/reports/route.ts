import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

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

  const { reports } = await getCollections();
  await reports.insertOne({
    reporterId: new ObjectId(session.user.id),
    targetType: parsed.data.targetType,
    targetId: new ObjectId(parsed.data.targetId),
    reason: parsed.data.reason,
    details: parsed.data.details,
    status: "open",
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
