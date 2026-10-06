import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dashboardPathFor } from "@/lib/home-for-role";

// Already signed in? Skip the login form and go to your dashboard.
export default async function LoginLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user) redirect(dashboardPathFor(session.user.role));
  return children;
}
