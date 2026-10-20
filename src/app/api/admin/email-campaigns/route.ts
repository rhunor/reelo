import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { sendCampaignBatch, sendCampaignTest } from "@/lib/email";
import { AUDIENCES, audienceRecipients, isMarketing, unsubscribeUrl } from "@/lib/email-campaigns";
import type { EmailAudience } from "@/types/models";

// Sending to a few thousand people takes a while (100 per request, ~2 requests a second).
export const maxDuration = 300;

const audienceIds = AUDIENCES.map((a) => a.id) as [EmailAudience, ...EmailAudience[]];

const schema = z.object({
  audience: z.enum(audienceIds),
  verifiedOnly: z.boolean().default(false),
  subject: z.string().trim().min(3, "Add a subject").max(140),
  message: z.string().trim().min(10, "Write a message").max(10000),
  buttonLabel: z.string().trim().max(40).optional(),
  buttonUrl: z.string().trim().url("The button link must be a full web address").optional().or(z.literal("")),
  test: z.boolean().default(false),
});

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin" ? session.user : null;
}

// GET ?audience=&verifiedOnly= — how many people that audience reaches right now.
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const audience = params.get("audience") as EmailAudience;
  if (!audienceIds.includes(audience)) return NextResponse.json({ error: "Unknown audience" }, { status: 400 });
  const recipients = await audienceRecipients(audience, params.get("verifiedOnly") === "1");
  return NextResponse.json({ count: recipients.length });
}

// POST — send a test to yourself, or the real campaign.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  }
  const data = parsed.data;
  const content = {
    subject: data.subject,
    message: data.message,
    buttonLabel: data.buttonLabel || undefined,
    buttonUrl: data.buttonUrl || undefined,
  };
  if ((content.buttonLabel && !content.buttonUrl) || (!content.buttonLabel && content.buttonUrl)) {
    return NextResponse.json({ error: "Add both a button label and a link, or neither" }, { status: 400 });
  }

  const { users, emailCampaigns } = await getCollections();
  const me = await users.findOne({ _id: new ObjectId(admin.id) }, { projection: { email: 1, name: 1, firstName: 1 } });

  if (data.test) {
    if (!me?.email) return NextResponse.json({ error: "Your account has no email" }, { status: 400 });
    const ok = await sendCampaignTest(me.email, me.firstName ?? me.name, content);
    return ok
      ? NextResponse.json({ success: true, sentTo: me.email })
      : NextResponse.json({ error: "The test email couldn't be sent" }, { status: 502 });
  }

  const recipients = await audienceRecipients(data.audience, data.verifiedOnly);
  if (recipients.length === 0) return NextResponse.json({ error: "Nobody is in that audience yet" }, { status: 400 });

  const marketing = isMarketing(data.audience);
  const result = await sendCampaignBatch(
    content,
    recipients.map((u) => ({
      to: u.email,
      name: u.firstName ?? u.name,
      unsubscribeUrl: marketing ? unsubscribeUrl(u._id!) : undefined,
    })),
  );

  await emailCampaigns.insertOne({
    ...content,
    audience: data.audience,
    verifiedOnly: data.verifiedOnly,
    recipients: recipients.length,
    sent: result.sent,
    failed: result.failed,
    sentBy: new ObjectId(admin.id),
    sentByName: me?.name,
    createdAt: new Date(),
  });
  return NextResponse.json({ success: true, ...result, recipients: recipients.length });
}
