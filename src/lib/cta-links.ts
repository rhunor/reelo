import type { Session } from "next-auth";
import { isStaffRole } from "@/lib/roles";
import { dashboardPathFor } from "@/lib/home-for-role";

// Marketing links that send visitors to sign up should send signed-in people to the
// matching place in their account instead.
export function ctaLinks(session: Session | null) {
  const user = session?.user;
  if (!user) {
    return {
      signedIn: false,
      listProperty: "/register?role=landlord",
      referralCode: "/register",
      account: "/register",
    };
  }
  const dashboard = dashboardPathFor(user.role);
  return {
    signedIn: true,
    // Staff accounts can't list properties, so theirs goes to their own dashboard.
    listProperty: isStaffRole(user.role) ? dashboard : "/dashboard/landlord/listings/new",
    referralCode: `${dashboard}#referral-code`,
    account: dashboard,
  };
}
