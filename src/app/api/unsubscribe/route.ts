import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/email-campaigns";

// Turns off Reallow newsletter emails for the signed link's owner. POST only (from the
// /unsubscribe page's button, or an email client's one-click unsubscribe), so link
// scanners that merely open the URL can't unsubscribe anyone.
export async function POST(request: Request) {
  const url = new URL(request.url);
  let u = url.searchParams.get("u") ?? "";
  let t = url.searchParams.get("t") ?? "";
  const body = await request.json().catch(() => null);
  if (body?.u) u = String(body.u);
  if (body?.t) t = String(body.t);
  if (!ObjectId.isValid(u) || !verifyUnsubscribe(u, t)) {
    return NextResponse.json({ error: "This unsubscribe link isn't valid" }, { status: 400 });
  }
  const { users } = await getCollections();
  await users.updateOne({ _id: new ObjectId(u) }, { $set: { newsletterOptIn: false, updatedAt: new Date() } });
  return NextResponse.json({ success: true });
}
