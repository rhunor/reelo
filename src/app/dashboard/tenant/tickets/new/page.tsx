import { NewTicketForm } from "@/components/new-ticket-form";
import { getT } from "@/lib/i18n/server";

export default async function NewTenantTicketPage() {
  const t = await getT();
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">{t("dash.messages")}</h1>
      <p className="mt-2 text-sm text-foreground/70">{t("tickets.newIntro")}</p>
      <NewTicketForm redirectBasePath="/dashboard/tenant/tickets" />
    </div>
  );
}
