import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { TicketMessages } from "@/components/ticket-messages";
import { ReplyForm } from "@/components/reply-form";
import { InspectionBookingForm } from "@/components/inspection-booking-form";
import { getInspectionFee } from "@/lib/fees";

export const dynamic = "force-dynamic";

export default async function TenantTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ObjectId.isValid(id)) notFound();

  const { tickets, properties, users, inspectionBookings } = await getCollections();
  const ticket = await tickets.findOne({ _id: new ObjectId(id) });
  if (!ticket || ticket.userId.toString() !== session.user.id) notFound();

  const decision = ticket.landlordDecision ?? (ticket.landlordPreferred ? "approved" : undefined);
  const [listing, user, existingBooking] = await Promise.all([
    ticket.listingId ? properties.findOne({ _id: ticket.listingId }) : null,
    users.findOne({ _id: new ObjectId(session.user.id) }),
    inspectionBookings.findOne({ ticketId: ticket._id }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold break-words">{ticket.subject}</h1>
      <p className="mt-1 text-sm capitalize text-foreground/50">{ticket.status.replace("_", " ")}</p>

      {decision === "approved" && (
        <div className="mt-3 rounded-lg border border-line p-4">
          <p className="text-sm font-medium text-verified">
            The landlord approved you for this listing.
          </p>
          {existingBooking ? (
            <p className="mt-2 text-sm text-foreground/70">
              Inspection booked for {new Date(existingBooking.scheduledFor).toLocaleString()}.
            </p>
          ) : listing && user?.verifiedBadge ? (
            <InspectionBookingForm
              ticketId={ticket._id!.toString()}
              feeNGN={getInspectionFee(listing.location.city)}
            />
          ) : listing ? (
            <p className="mt-2 text-sm text-red-600">
              Verify your identity to book a paid inspection —{" "}
              <Link href="/dashboard/verify-identity" className="underline">
                verify now
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}

      {decision === "declined" && (
        <p className="mt-1 text-sm font-medium text-foreground/50">
          The landlord has moved on from this application.
        </p>
      )}

      <TicketMessages messages={ticket.messages} />
      <ReplyForm ticketId={ticket._id!.toString()} />
    </div>
  );
}
