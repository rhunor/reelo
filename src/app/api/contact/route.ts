import { NextResponse } from "next/server";
import { z } from "zod";
import { sendMessageReceivedEmail, sendSupportInboxEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { topicLabel } from "@/lib/faqs";

// Contact form for visitors without an account — there's no ticket to attach it to, so it
// goes straight to Reallow's inbox (Reply-To the sender) with a receipt to the sender.
// Logged-in users post to /api/tickets instead, which keeps the conversation in-app.
const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(20).optional(),
  topic: z.string().max(40).optional(),
  subject: z.string().trim().min(3, "Add a short subject").max(150),
  message: z.string().trim().min(5, "Tell us a little more").max(5000),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  // Honeypot — bots fill every field; real visitors never see this one.
  if (parsed.data.website) return NextResponse.json({ success: true });

  const { name, email, phone, topic, subject, message } = parsed.data;
  await sendSupportInboxEmail({
    supportEmail: SUPPORT_EMAIL,
    fromName: name,
    fromEmail: email,
    fromPhone: phone || undefined,
    topic: topicLabel(topic),
    subject,
    message,
  });
  await sendMessageReceivedEmail(email, name, subject);

  return NextResponse.json({ success: true });
}
