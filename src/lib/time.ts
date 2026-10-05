// Reallow operates only in Nigeria (WAT, UTC+1, no daylight saving). A <input
// type="datetime-local"> value like "2026-10-12T10:00" carries no timezone, and the server
// (UTC on Vercel) would otherwise read it as 10:00 UTC — an hour off. These helpers pin
// both directions to Lagos time.
const LAGOS_OFFSET = "+01:00";
export const LAGOS_TIME_ZONE = "Africa/Lagos";

export function parseLagosDateTimeLocal(value: string): Date {
  // Already has an explicit offset or "Z" — trust it.
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`${withSeconds}${LAGOS_OFFSET}`);
}

// The inverse — a Date as "YYYY-MM-DDTHH:mm" in Lagos time, for a datetime-local's value.
export function toLagosDateTimeLocal(date: Date): string {
  const shifted = new Date(date.getTime() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function formatLagos(date: Date | string, style: "short" | "long" = "short"): string {
  return new Date(date).toLocaleString("en-NG", {
    timeZone: LAGOS_TIME_ZONE,
    dateStyle: style === "long" ? "full" : "medium",
    timeStyle: "short",
  });
}
