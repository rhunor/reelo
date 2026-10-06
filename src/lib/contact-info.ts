// Reallow's public contact details — shared by /contact, /help, and support emails.
export const SUPPORT_EMAIL = "reallowng@gmail.com";
export const SUPPORT_PHONES = ["08104669006", "09067487805"];
export const OFFICE_ADDRESS = {
  lines: ["83 Effurun-Sapele Road", "Effurun, Warri", "Delta State, Nigeria"],
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=83+Effurun-Sapele+Road+Effurun+Warri+Delta+State",
};
// `daysKey` / `hoursKey` are translation keys; `hours` is shown as-is when there's no key.
export const OPENING_HOURS = [
  { daysKey: "hours.weekdays", hours: "8:00am – 6:00pm" },
  { daysKey: "hours.saturday", hours: "10:00am – 3:00pm" },
  { daysKey: "hours.sunday", hoursKey: "hours.closed", hours: "Closed" },
] as const;
