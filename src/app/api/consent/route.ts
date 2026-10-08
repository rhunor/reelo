import { NextResponse } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db";
import { deviceOf, isBot } from "@/lib/analytics";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_S, SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/consent";

const schema = z.object({ choice: z.enum(["all", "essential"]) });

// Saves the cookie-banner answer as a cookie and counts it (no personal data) for the
// admin analytics page. Choosing "essential" also clears any analytics ids already set.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  const { choice } = parsed.data;

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!isBot(userAgent)) {
    const { consentEvents } = await getCollections();
    await consentEvents.insertOne({ choice, device: deviceOf(userAgent), createdAt: new Date() });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(CONSENT_COOKIE, choice, {
    maxAge: CONSENT_MAX_AGE_S,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  if (choice === "essential") {
    response.cookies.delete(VISITOR_COOKIE);
    response.cookies.delete(SESSION_COOKIE);
  }
  return response;
}
