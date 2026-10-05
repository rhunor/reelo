import { redirect } from "next/navigation";

// There's one dashboard for every customer account now.
export default function OldDashboardPage() {
  redirect("/dashboard");
}
