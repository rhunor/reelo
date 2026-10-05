import { redirect } from "next/navigation";

// Old address — the profile form now lives in Settings.
export default function CompleteProfilePage() {
  redirect("/dashboard/settings#profile");
}
