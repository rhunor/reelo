import type { UserRole } from "@/types/models";

// Where "your dashboard" is for each kind of account.
export function dashboardPathFor(role: UserRole | undefined): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "support") return "/dashboard/support";
  if (role === "staff") return "/dashboard/staff";
  return "/dashboard";
}
