import type { NextAuthConfig } from "next-auth";

function roleForDashboardPath(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/landlord")) return "landlord";
  if (pathname.startsWith("/dashboard/tenant")) return "tenant";
  if (pathname.startsWith("/dashboard/admin")) return "admin";
  if (pathname.startsWith("/dashboard/support")) return "support";
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
      const requiredRole = roleForDashboardPath(pathname);
      if (!requiredRole) return true;

      const role = auth?.user?.role;
      if (!role) return false;
      if (role !== requiredRole && role !== "admin") {
        return Response.redirect(new URL("/", origin));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
