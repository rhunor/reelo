import type { UserRole } from "@/types/models";

// One Reallow account can act as both landlord and tenant — list a property AND apply for
// one — since what you can do depends on the action you take, not which of "landlord" or
// "tenant" you originally signed up as (that value only decides which dashboard is your
// default "home"). Admin, support, and staff (field agents) remain distinct, internal-only
// account types that can't transact as a customer. This is the one place that draws the
// "is this an internal account" line, so every permission check that used to hard-require
// role === "landlord" or role === "tenant" can instead just exclude staff — and it doubles
// as the "does the higher referral-commission rate apply" check (see lib/referrals.ts).
export function isStaffRole(role: UserRole | undefined): boolean {
  return role === "admin" || role === "support" || role === "staff";
}
