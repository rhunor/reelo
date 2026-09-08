import crypto from "crypto";

export function generateEmailVerificationToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  return { token, expiresAt };
}

function appBaseUrl(): string {
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

// Raw REST call rather than the `resend` SDK, matching how src/lib/paystack.ts talks to
// Paystack elsewhere in this codebase — one fetch call doesn't justify a new dependency.
//
// No verified domain yet: Resend restricts unverified accounts to sending FROM
// onboarding@resend.dev and TO only the email address on the Resend account itself. So
// this will deliver fine for testing against your own inbox, but won't reach real users
// until a domain is verified in the Resend dashboard — swap the `from` address below to a
// real Reallow address (e.g. noreply@reallow.ng) once that's done.
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const verifyUrl = `${appBaseUrl()}/verify-email?token=${token}`;

  if (!apiKey) {
    // eslint-disable-next-line no-console -- deliberate: this is the only record of the
    // verification link until an email provider is wired up.
    console.log(`[email:verification] RESEND_API_KEY not set — would send to ${to}: ${verifyUrl}`);
    return;
  }

  const html = emailShell(`
    <p>Welcome to Reallow — verify your email to finish setting up your account:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${verifyUrl}" style="background:#c1502e;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;display:inline-block;">
        Verify email
      </a>
    </p>
    <p style="font-size:13px;color:#666;">Or paste this link into your browser: ${verifyUrl}</p>
    <p style="font-size:13px;color:#666;">This link expires in 24 hours.</p>
  `);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Reallow <onboarding@resend.dev>",
        to: [to],
        subject: "Verify your email — Reallow",
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      // Never throw — a failed verification email must not break registration itself.
      console.error("[email:verification] Resend send failed:", error);
    }
  } catch (error) {
    console.error("[email:verification] Resend request failed:", error);
  }
}
