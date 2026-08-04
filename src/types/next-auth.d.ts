import type { DefaultSession } from "next-auth";
import type { SubscriptionTier, UserRole } from "@/types/models";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      subscriptionTier: SubscriptionTier;
      verifiedBadge: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    subscriptionTier: SubscriptionTier;
    verifiedBadge: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    subscriptionTier: SubscriptionTier;
    verifiedBadge: boolean;
  }
}
