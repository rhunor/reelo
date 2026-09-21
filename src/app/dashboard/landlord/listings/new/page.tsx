import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewListingForm } from "@/components/new-listing-form";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">List a property</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Free to list. It won&apos;t appear on the site until Reallow completes the in-person
        verification inspection you propose a date for below and approves it — and Reallow
        won&apos;t schedule that inspection until your own identity is verified, so it&apos;s
        worth doing that in parallel.
      </p>
      <NewListingForm />
    </div>
  );
}
