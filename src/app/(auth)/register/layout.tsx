import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dashboardPathFor } from "@/lib/home-for-role";

// Already signed in? There's nothing to sign up for — go to your dashboard.
export default async function RegisterLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user) redirect(dashboardPathFor(session.user.role));
  return children;
}
