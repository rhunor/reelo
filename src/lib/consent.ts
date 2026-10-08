// Cookie consent and first-party analytics (see /cookies for the public policy).
//
// - reallow-consent: "all" or "essential" — the visitor's choice from the cookie banner.
// - reallow-vid: a random visitor id (1 year), only ever set once they accept "all".
// - reallow-sid: a random session id, renewed on each page view, ends after 30 idle minutes.
//
// Essential cookies (sign-in session, language, this consent choice) are always used; the
// visitor/session cookies and page-view tracking only happen with "all".
export const CONSENT_COOKIE = "reallow-consent";
export const VISITOR_COOKIE = "reallow-vid";
export const SESSION_COOKIE = "reallow-sid";

export type ConsentChoice = "all" | "essential";

export const CONSENT_MAX_AGE_S = 365 * 24 * 3600;
export const VISITOR_MAX_AGE_S = 365 * 24 * 3600;
export const SESSION_IDLE_S = 30 * 60;

// Page views are kept for 13 months, then deleted automatically (TTL index in db.ts).
export const ANALYTICS_RETENTION_S = 400 * 24 * 3600;

// Fired by the footer's "Cookie settings" link to reopen the banner.
export const COOKIE_SETTINGS_EVENT = "reallow:cookie-settings";

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === "all" || value === "essential";
}
