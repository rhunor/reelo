import { NewTicketForm } from "@/components/new-ticket-form";

export default function NewTenantTicketPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Message Reelo</h1>
      <p className="mt-2 text-sm text-foreground/70">
        For general questions, account issues, or disputes. To ask about a specific property, use
        the &quot;Contact Reelo&quot; box on that listing&apos;s page instead.
      </p>
      <NewTicketForm redirectBasePath="/dashboard/tenant/tickets" />
    </div>
  );
}
