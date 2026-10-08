import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { browserOf, deviceOf, headerValue, isBot, sourceOf } from "@/lib/analytics";
import {
  CONSENT_COOKIE,
  SESSION_COOKIE,
  SESSION_IDLE_S,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE_S,
} from "@/lib/consent";

const schema = z.object({
  path: z.string().min(1).max(300),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

// One page view, sent by <AnalyticsTracker> on every navigation — but only recorded when the
// visitor accepted analytics cookies. Sets the visitor id (1 year) and a rolling 30-minute
// session id. Never stores an IP address.
export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(CONSENT_COOKIE)?.value !== "all") return new NextResponse(null, { status: 204 });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return new NextResponse(null, { status: 204 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.path.startsWith("/")) return new NextResponse(null, { status: 204 });
  const data = parsed.data;

  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId || visitorId.length > 64) visitorId = crypto.randomUUID();
  let sessionId = jar.get(SESSION_COOKIE)?.value;
  const newSession = !sessionId || sessionId.length > 64;
  if (newSession) sessionId = crypto.randomUUID();

  const session = await auth();
  const ownHost = new URL(request.url).hostname;
  const { analyticsEvents } = await getCollections();
  await analyticsEvents.insertOne({
    visitorId,
    sessionId: sessionId!,
    newSession,
    userId: session?.user?.id && ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : undefined,
    path: data.path.split("?")[0]!,
    // Only the first page of a session carries the outside referrer.
    source: newSession ? sourceOf(data.utmSource, data.referrer, ownHost) : "(same session)",
    referrer: newSession ? data.referrer || undefined : undefined,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    device: deviceOf(userAgent),
    browser: browserOf(userAgent),
    country: headerValue(request.headers, "x-vercel-ip-country"),
    region: headerValue(request.headers, "x-vercel-ip-country-region"),
    city: headerValue(request.headers, "x-vercel-ip-city"),
    language: request.headers.get("accept-language")?.split(",")[0]?.slice(0, 20),
    createdAt: new Date(),
  });

  const secure = process.env.NODE_ENV === "production";
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: VISITOR_MAX_AGE_S, sameSite: "lax", secure, httpOnly: true, path: "/" });
  response.cookies.set(SESSION_COOKIE, sessionId!, { maxAge: SESSION_IDLE_S, sameSite: "lax", secure, httpOnly: true, path: "/" });
  return response;
}
