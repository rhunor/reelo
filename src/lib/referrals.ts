import { getCollections } from "@/lib/db";
import { isStaffRole } from "@/lib/roles";
import type { UserRole } from "@/types/models";

// Commission rates are deliberately never imported into anything client-rendered — the
// product decision is that nobody, referrer included, ever sees the actual percentage.
// Promotional copy only ever says "a percentage of sales completed using your code."
const STAFF_REFERRAL_RATE = 0.01;
const PUBLIC_REFERRAL_RATE = 0.005;

export function computeReferralCommission(rentNGN: number, referrerRole: UserRole): number {
  const rate = isStaffRole(referrerRole) ? STAFF_REFERRAL_RATE : PUBLIC_REFERRAL_RATE;
  return Math.round(rentNGN * rate);
}

export function referralRateFor(referrerRole: UserRole): number {
  return isStaffRole(referrerRole) ? STAFF_REFERRAL_RATE : PUBLIC_REFERRAL_RATE;
}

function randomSuffix(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, easier to read aloud
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// A short, shareable code every account gets at signup — name-derived so it's at least a
// little memorable, collision-checked against real data since a random 4-char suffix can
// theoretically repeat.
export async function generateReferralCode(firstName: string): Promise<string> {
  const { users } = await getCollections();
  const base = firstName.replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase() || "REALLOW";

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${base}${randomSuffix(4)}`;
    const existing = await users.findOne({ referralCode: code });
    if (!existing) return code;
  }

  // Astronomically unlikely to ever reach here, but never leave a user without a code.
  return `${base}${Date.now().toString(36).toUpperCase()}`;
}
