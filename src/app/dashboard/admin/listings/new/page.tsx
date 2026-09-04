import { NewAdminListingForm } from "@/components/new-admin-listing-form";

export default function NewAdminListingPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Post a property directly</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Goes live immediately as a verified listing. Enter the landlord&apos;s account email to
        attribute it to them, or leave it blank to list it as Reallow.
      </p>
      <NewAdminListingForm />
    </div>
  );
}
