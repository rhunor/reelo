import type { NextAuthConfig } from "next-auth";

// One account can act as both landlord and tenant (list a property AND apply for one) —
// what you can do depends on the action you take, not which of these two you originally
// signed up as. So /dashboard/landlord and /dashboard/tenant are both open to either,
// while /dashboard/admin and /dashboard/support stay staff-only. Admin can still reach
// everything (see the `role !== "admin"` override below).
function allowedRolesForDashboardPath(pathname: string): string[] | null {
  if (pathname.startsWith("/dashboard/landlord") || pathname.startsWith("/dashboard/tenant")) {
    return ["landlord", "tenant"];
  }
  if (pathname.startsWith("/dashboard/admin")) return ["admin"];
  if (pathname.startsWith("/dashboard/support")) return ["support"];
  if (pathname.startsWith("/dashboard/staff")) return ["staff"];
  return null;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Auth.js doesn't expose custom JWT fields on the session automatically — without this,
    // the middleware below (which runs this config alone, not the full one in auth.ts) sees
    // `auth.user.role` as undefined for every request, so every /dashboard/* route bounces
    // any logged-in user back to /login regardless of their actual role.
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.verifiedBadge = token.verifiedBadge;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname, origin } = request.nextUrl;
      const allowedRoles = allowedRolesForDashboardPath(pathname);
      if (!allowedRoles) return true;

      const role = auth?.user?.role;
      if (!role) return false;
      if (!allowedRoles.includes(role) && role !== "admin") {
        return Response.redirect(new URL("/", origin));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
