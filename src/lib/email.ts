import crypto from "crypto";
import { formatLagos } from "@/lib/time";
import { EMAIL_LOGO_PNG_BASE64 } from "@/lib/email-logo";

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

// Every email goes out from the verified reallow.co domain. EMAIL_FROM can override it.
const EMAIL_FROM = process.env.EMAIL_FROM || "Reallow <no-reply@reallow.co>";

// Wraps email body content with the official Reallow logo at the top. It's attached to every
// email as an inline image (cid:reallow-logo — see sendEmail), not linked from the website, so
// it shows even before a deploy and in clients that block remote images. PNG, not SVG —
// Outlook and Gmail don't render SVG in email.
const LOGO_CID = "reallow-logo";

// `logo`: "inline" attaches the logo to the email (single sends); "hosted" links the copy on
// the website, for Resend's batch API, which doesn't take attachments (campaigns).
function emailShell(bodyHtml: string, logo: "inline" | "hosted" = "inline", footerExtra = ""): string {
  const logoUrl = logo === "inline" ? `cid:${LOGO_CID}` : `${appBaseUrl()}/reallow-logo-email.png`;
  return `
    <div style="background:#f7f3ec;padding:24px 12px;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:8px 28px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1c1712;">
        <div style="text-align:center;padding:20px 0 12px;">
          <img src="${logoUrl}" alt="Reallow" width="220" height="68" style="display:inline-block;width:220px;height:auto;border:0;" />
        </div>
        ${bodyHtml}
      </div>
      <p style="max-width:520px;margin:16px auto 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8a8178;text-align:center;">
        Reallow · 83 Effurun-Sapele Road, Effurun, Warri, Delta State · 09020253413<br />
        This is an automated message — please don&#39;t reply to this email.${footerExtra}
      </p>
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
// listing, scheduling) — the in-app notification is always the primary channel. Returns
// whether Resend accepted it, for the few emails a flow depends on (login codes, resets).
async function sendEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  tag: string,
  replyTo?: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:${tag}] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html: emailShell(bodyHtml),
        attachments: [{ filename: "reallow-logo.png", content: EMAIL_LOGO_PNG_BASE64, content_id: LOGO_CID }],
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error(`[email:${tag}] Resend send failed:`, await response.json().catch(() => null));
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email:${tag}] Resend request failed:`, error);
    return false;
  }
}

// The one-time code asked for at every sign-in, after the password.
export async function sendLoginCodeEmail(to: string, name: string, code: string, minutes: number): Promise<boolean> {
  return sendEmail(
    to,
    `${code} is your Reallow sign-in code`,
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Here's your code to finish signing in to Reallow:</p>
    <p style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1a314f;background:#f7f3ec;border-radius:12px;padding:14px 22px;">${code}</span>
    </p>
    <p style="font-size:13px;color:#666;">It expires in ${minutes} minutes. Reallow will never ask you for this code — if you didn't just try to sign in, change your password straight away.</p>
    `,
    "login-code",
  );
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string, minutes: number): Promise<boolean> {
  return sendEmail(
    to,
    "Reset your Reallow password",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>We got a request to reset the password on your Reallow account. Choose a new one here:</p>
    <p style="text-align:center;margin:24px 0;">${button(resetUrl, "Reset password")}</p>
    <p style="font-size:13px;color:#666;">Or paste this link into your browser: ${resetUrl}</p>
    <p style="font-size:13px;color:#666;">The link expires in ${minutes} minutes and can only be used once. If you didn't ask for this, you can ignore this email — your password won't change.</p>
    `,
    "password-reset",
  );
}

// Security notice after any password change (reset or from Settings).
export async function sendPasswordChangedEmail(to: string, name: string): Promise<boolean> {
  return sendEmail(
    to,
    "Your Reallow password was changed",
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>The password on your Reallow account was just changed.</p>
    <p style="font-size:13px;color:#666;">If this was you, there's nothing else to do. If it wasn't, reset your password now from the sign-in page and contact Reallow on 09020253413.</p>
    <p style="text-align:center;margin:24px 0;">${button(`${appBaseUrl()}/forgot-password`, "Reset password")}</p>
    `,
    "password-changed",
  );
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

// The email copy of an in-app notification (meeting requests, applications, payments…):
// same title and message, with a button back to the right page.
export async function sendNotificationEmail(
  to: string,
  name: string,
  notice: { title: string; body: string; href?: string },
): Promise<boolean> {
  const url = notice.href ? (notice.href.startsWith("http") ? notice.href : `${appBaseUrl()}${notice.href}`) : `${appBaseUrl()}/dashboard`;
  return sendEmail(
    to,
    `${notice.title} — Reallow`,
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p style="font-size:17px;font-weight:600;margin:16px 0 4px;">${escapeHtml(notice.title)}</p>
    <p>${escapeHtml(notice.body)}</p>
    <p style="text-align:center;margin:24px 0;">${button(url, "Open in Reallow")}</p>
    <p style="font-size:12px;color:#888;">You're getting this because it's an update on your Reallow account. You'll also find it under the bell icon when you sign in.</p>
    `,
    "notification",
  );
}

// Admin campaigns (Admin → Email users). Sent through Resend's batch endpoint, up to 100 per
// request. Each recipient gets their own copy (personal greeting + unsubscribe link).
export interface CampaignEmail {
  to: string;
  name: string;
  unsubscribeUrl?: string;
}

export function renderCampaignHtml(
  { subject, message, buttonLabel, buttonUrl }: { subject: string; message: string; buttonLabel?: string; buttonUrl?: string },
  recipient: { name: string; unsubscribeUrl?: string },
  logo: "inline" | "hosted" = "hosted",
): string {
  const paragraphs = message
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
  const cta = buttonLabel && buttonUrl ? `<p style="text-align:center;margin:24px 0;">${button(buttonUrl, escapeHtml(buttonLabel))}</p>` : "";
  const unsubscribe = recipient.unsubscribeUrl
    ? `<br /><a href="${recipient.unsubscribeUrl}" style="color:#8a8178;">Unsubscribe from Reallow updates</a>`
    : "";
  return emailShell(
    `<p>Hi ${escapeHtml(recipient.name)},</p>
     <p style="font-size:17px;font-weight:600;margin:16px 0 4px;">${escapeHtml(subject)}</p>
     ${paragraphs}${cta}`,
    logo,
    unsubscribe,
  );
}

// Returns how many were accepted by Resend and how many failed.
export async function sendCampaignBatch(
  content: { subject: string; message: string; buttonLabel?: string; buttonUrl?: string },
  recipients: CampaignEmail[],
): Promise<{ sent: number; failed: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:campaign] RESEND_API_KEY not set — would send "${content.subject}" to ${recipients.length}`);
    return { sent: 0, failed: recipients.length };
  }
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((r) => ({
            from: EMAIL_FROM,
            to: [r.to],
            subject: content.subject,
            html: renderCampaignHtml(content, r),
            ...(r.unsubscribeUrl
              ? {
                  // Email apps' one-click "Unsubscribe" POSTs straight to the API route.
                  headers: {
                    "List-Unsubscribe": `<${r.unsubscribeUrl.replace("/unsubscribe?", "/api/unsubscribe?")}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  },
                }
              : {}),
          })),
        ),
      });
      if (response.ok) sent += chunk.length;
      else {
        failed += chunk.length;
        console.error("[email:campaign] batch failed:", await response.json().catch(() => null));
      }
    } catch (error) {
      failed += chunk.length;
      console.error("[email:campaign] batch request failed:", error);
    }
    // Stay under Resend's default 2 requests/second.
    if (i + 100 < recipients.length) await new Promise((r) => setTimeout(r, 600));
  }
  return { sent, failed };
}

// A single campaign email (the "send test to me" button), with the logo attached inline.
export async function sendCampaignTest(
  to: string,
  name: string,
  content: { subject: string; message: string; buttonLabel?: string; buttonUrl?: string },
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: `[Test] ${content.subject}`,
        html: renderCampaignHtml(content, { name }, "inline"),
        attachments: [{ filename: "reallow-logo.png", content: EMAIL_LOGO_PNG_BASE64, content_id: LOGO_CID }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
