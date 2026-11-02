// Reallow's public contact details (deliberately no office address) — shared by /contact, /help, and support emails.
export const SUPPORT_EMAIL = "support@reallow.co";
export const SUPPORT_PHONES = ["09020253413"];
// `daysKey` / `hoursKey` are translation keys; `hours` is shown as-is when there's no key.
export const OPENING_HOURS = [
  { daysKey: "hours.weekdays", hours: "8:00am – 6:00pm" },
  { daysKey: "hours.saturday", hours: "10:00am – 3:00pm" },
  { daysKey: "hours.sunday", hoursKey: "hours.closed", hours: "Closed" },
] as const;
