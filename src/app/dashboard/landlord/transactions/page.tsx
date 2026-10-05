import { redirect } from "next/navigation";

// Transaction history opens as a window on the dashboard now.
export default function OldTransactionsPage() {
  redirect("/dashboard?panel=transactions");
}
