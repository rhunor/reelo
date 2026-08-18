import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { NewListingForm } from "@/components/new-listing-form";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });

  if (!user?.verifiedBadge) {
    return (
      <div className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">Verify your identity first</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Reallow verifies every landlord against the NIN database before they can list a
          property.
        </p>
        <Link
          href="/dashboard/verify-identity"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90"
        >
          Verify now
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">List a property</h1>
      <p className="mt-2 text-sm text-foreground/70">
        This listing is saved as a draft. It won&apos;t appear on the site until you pay the
        ₦15,000 verification fee and Reallow completes an in-person inspection and approves it.
      </p>
      <NewListingForm />
    </div>
  );
}
