import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/models";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      verifiedBadge: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    verifiedBadge: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    verifiedBadge: boolean;
  }
}
