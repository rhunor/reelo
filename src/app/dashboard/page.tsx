import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardIndexPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  switch (session.user.role) {
    case "landlord":
      redirect("/dashboard/landlord");
    case "tenant":
      redirect("/dashboard/tenant");
    case "admin":
      redirect("/dashboard/admin");
    case "support":
      redirect("/dashboard/support");
  }
}
