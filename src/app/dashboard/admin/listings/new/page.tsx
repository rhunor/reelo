import { NewAdminListingForm } from "@/components/new-admin-listing-form";

export default function NewAdminListingPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Post a property directly</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Goes live immediately as a verified listing — no ₦15,000 fee, no in-person inspection
        queue. The landlord must already have an account; enter the email they registered with.
      </p>
      <NewAdminListingForm />
    </div>
  );
}
