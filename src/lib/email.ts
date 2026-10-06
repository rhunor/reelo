import crypto from "crypto";
import { formatLagos } from "@/lib/time";

export function generateEmailVerificationToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  return { token, expiresAt };
}

export function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Wraps email body content with the Reallow icon at the top. PNG, not SVG — Outlook
// desktop doesn't render SVG images in HTML email at all. This is public/reallow-icon.png
// (a stand-in for the full wordmark logo, which hasn't been supplied yet) — swap the
// src/alt here once the real logo asset exists.
function emailShell(bodyHtml: string): string {
  const logoUrl = `${appBaseUrl()}/reallow-icon.png`;
  return `
    <div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#1c1712;">
      <div style="text-align:center;padding:24px 0;">
        <img src="${logoUrl}" alt="Reallow" width="48" height="51" style="display:inline-block;" />
      </div>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#888;text-align:center;">Reallow</p>
    </div>
  `;
}

function button(href: string, label: string, secondary = false): string {
  const style = secondary
    ? "border:1px solid #c1502e;color:#c1502e;"
    : "background:#c1502e;color:#fff;";
  return `<a href="${href}" style="${style}padding:12px 24px;border-radius:999px;text-decoration:none;display:inline-block;margin:4px;">${label}</a>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Raw REST call rather than the `resend` SDK, matching how src/lib/paystack.ts talks to
// Paystack elsewhere in this codebase — one fetch call doesn't justify a new dependency.
// Never throws: an email failing must never break the action that triggered it (signup,
// listing, scheduling) — the in-app notification is always the primary channel.
//
// No verified domain yet: Resend restricts unverified accounts to sending FROM
// onboarding@resend.dev and TO only the email address on the Resend account itself. So
// this will deliver fine for testing against your own inbox, but won't reach real users
// until a domain is verified in the Resend dashboard — swap the `from` address below to a
// real Reallow address (e.g. noreply@reallow.ng) once that's done.
async function sendEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  tag: string,
  replyTo?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:${tag}] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Reallow <onboarding@resend.dev>",
        to: [to],
        subject,
        html: emailShell(bodyHtml),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error(`[email:${tag}] Resend send failed:`, await response.json().catch(() => null));
    }
  } catch (error) {
    console.error(`[email:${tag}] Resend request failed:`, error);
  }
}

export async function sendListingReceivedEmail(to: string, name: string, listingTitle: string): Promise<void> {
  await sendEmail(
    to,
    "We've received your listing — Reallow",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Good news — we've received your listing <strong>${escapeHtml(listingTitle)}</strong>.</p>
    <p>A Reallow agent will contact you shortly to arrange an in-person verification visit.
    Once that's done and approved, your listing goes live.</p>
    <p style="text-align:center;margin:24px 0;">${button(`${appBaseUrl()}/dashboard/landlord`, "View your listings")}</p>
    `,
    "listing-received",
  );
}

export async function sendListingReviewedEmail(
  to: string,
  name: string,
  listingTitle: string,
  listingId: string,
  outcome: "approved" | "rejected",
  reason?: string,
): Promise<void> {
  const approved = outcome === "approved";
  await sendEmail(
    to,
    approved ? "Your listing is live on Reallow" : "Your listing wasn't approved — Reallow",
    approved
      ? `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Good news — <strong>${escapeHtml(listingTitle)}</strong> passed verification and is now live on Reallow.</p>
    <p>Verified tenants and buyers can find it and apply. We'll notify you as soon as someone does.</p>
    <p style="text-align:center;margin:24px 0;">${button(`${appBaseUrl()}/listings/${listingId}`, "View your listing")}</p>
    `
      : `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your listing <strong>${escapeHtml(listingTitle)}</strong> wasn't approved after the verification visit.</p>
    ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}
    <p>You can fix the issue and resubmit it for verification from your dashboard, or contact Reallow if you have questions.</p>
    <p style="text-align:center;margin:24px 0;">${button(`${appBaseUrl()}/dashboard`, "Go to your dashboard")}</p>
    `,
    approved ? "listing-approved" : "listing-rejected",
  );
}

// Confirm/decline both land on the website (behind login) rather than acting directly
// from the email — the same buttons are on the site regardless, the email just links there.
export async function sendVerificationVisitScheduledEmail(
  to: string,
  name: string,
  listingTitle: string,
  when: Date,
  listingId: string,
): Promise<void> {
  const pageUrl = `${appBaseUrl()}/dashboard/landlord/listings/${listingId}/verification`;
  const whenText = formatLagos(when, "long");
  await sendEmail(
    to,
    "Confirm your property verification visit — Reallow",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Reallow has scheduled the in-person verification visit for <strong>${escapeHtml(listingTitle)}</strong>:</p>
    <p style="font-size:18px;text-align:center;margin:20px 0;"><strong>${escapeHtml(whenText)}</strong></p>
    <p>Please confirm this works for you, or let us know if you need a different time.</p>
    <p style="text-align:center;margin:24px 0;">
      ${button(`${pageUrl}?response=confirm`, "Confirm")}
      ${button(`${pageUrl}?response=decline`, "I need a different time", true)}
    </p>
    `,
    "verification-visit",
  );
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${appBaseUrl()}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your email — Reallow",
    `
    <p>Welcome to Reallow — verify your email to finish setting up your account:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${verifyUrl}" style="background:#c1502e;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;display:inline-block;">
        Verify email
      </a>
    </p>
    <p style="font-size:13px;color:#666;">Or paste this link into your browser: ${verifyUrl}</p>
    <p style="font-size:13px;color:#666;">This link expires in 24 hours.</p>
  `,
    "verification",
  );
}

const nl2br = (text: string) => escapeHtml(text).replace(/\n/g, "<br/>");

// A message sent from /contact (or a new support ticket) — copied to Reallow's inbox so
// nothing waits on someone checking the admin dashboard. Reply-To is the sender.
export async function sendSupportInboxEmail(params: {
  supportEmail: string;
  fromName: string;
  fromEmail: string;
  fromPhone?: string;
  topic?: string;
  subject: string;
  message: string;
  ticketId?: string;
}): Promise<void> {
  const link = params.ticketId ? `${appBaseUrl()}/dashboard/support/tickets/${params.ticketId}` : undefined;
  await sendEmail(
    params.supportEmail,
    `[Reallow contact] ${params.subject}`,
    `
      <p><strong>${escapeHtml(params.fromName)}</strong> &lt;${escapeHtml(params.fromEmail)}&gt;${
        params.fromPhone ? ` · ${escapeHtml(params.fromPhone)}` : ""
      }</p>
      ${params.topic ? `<p>Topic: ${escapeHtml(params.topic)}</p>` : ""}
      <p style="padding:12px;background:#f5f1ec;border-radius:8px;">${nl2br(params.message)}</p>
      ${link ? `<p style="text-align:center;">${button(link, "Reply in the dashboard")}</p>` : "<p>Sent without an account — reply to this email.</p>"}
    `,
    "support-inbox",
    params.fromEmail,
  );
}

export async function sendMessageReceivedEmail(
  to: string,
  name: string,
  subject: string,
  ticketId?: string,
): Promise<void> {
  const link = ticketId ? `${appBaseUrl()}/dashboard/tenant/tickets/${ticketId}` : undefined;
  await sendEmail(
    to,
    "We've received your message",
    `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thanks for contacting Reallow about “${escapeHtml(subject)}”. Our team will get back to you as soon as possible — usually within one working day.</p>
      ${link ? `<p style="text-align:center;">${button(link, "View your message")}</p><p>We'll notify you here and by email when we reply.</p>` : "<p>We'll reply to this email address.</p>"}
    `,
    "message-received",
  );
}

export async function sendSupportReplyEmail(to: string, name: string, subject: string, reply: string, ticketId: string): Promise<void> {
  await sendEmail(
    to,
    `Reallow replied: ${subject}`,
    `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Reallow replied to your message “${escapeHtml(subject)}”:</p>
      <p style="padding:12px;background:#f5f1ec;border-radius:8px;">${nl2br(reply)}</p>
      <p style="text-align:center;">${button(`${appBaseUrl()}/dashboard/tenant/tickets/${ticketId}`, "Reply on Reallow")}</p>
    `,
    "support-reply",
  );
}
