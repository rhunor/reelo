// Reallow is for adults only — a date of birth must make the person at least 18.
export const MIN_AGE = 18;

const pad = (n: number) => String(n).padStart(2, "0");

// The latest birth date (YYYY-MM-DD) that is still 18 today — the date picker's `max`.
export function latestAdultBirthDate(today = new Date()): string {
  return `${today.getFullYear() - MIN_AGE}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

// Calendar-exact age check on a YYYY-MM-DD string (no leap-year rounding errors).
// Plain string comparison works because both sides are zero-padded YYYY-MM-DD.
export function isAdultBirthDate(value: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value).getTime())) return false;
  const oldest = `${today.getFullYear() - 120}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return value <= latestAdultBirthDate(today) && value >= oldest;
}
