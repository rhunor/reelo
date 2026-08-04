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
