// Small, dependency-free helpers for first-party analytics (see /api/track).

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime/i;

export function isBot(userAgent: string): boolean {
  return !userAgent || BOT.test(userAgent);
}

export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function browserOf(userAgent: string): string | undefined {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\/|opera/i.test(userAgent)) return "Opera";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung Internet";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  return undefined;
}

// Where a visit came from: an explicit utm_source wins, then the referring site's host
// (our own site doesn't count), else "Direct".
export function sourceOf(utmSource: string | undefined, referrer: string | undefined, ownHost: string): string {
  if (utmSource) return utmSource.toLowerCase().slice(0, 60);
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, "");
      if (host && host !== ownHost.replace(/^www\./, "")) return host.slice(0, 80);
    } catch {
      // Not a URL — ignore.
    }
  }
  return "Direct";
}

// Vercel's geo headers are URI-encoded (e.g. "Port%20Harcourt").
export function headerValue(headers: Headers, name: string): string | undefined {
  const value = headers.get(name);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).slice(0, 80);
  } catch {
    return value.slice(0, 80);
  }
}
