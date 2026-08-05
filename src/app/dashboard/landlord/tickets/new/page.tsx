import { NewTicketForm } from "@/components/new-ticket-form";

export default function NewLandlordTicketPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Message Reallow</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Questions about a listing, verification, payouts, or anything else — Reallow staff will
        respond here.
      </p>
      <NewTicketForm redirectBasePath="/dashboard/landlord/tickets" />
    </div>
  );
}
