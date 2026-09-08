import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type { Property, SupportTicket } from "@/types/models";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Called whenever a listing is published. Finds saved searches (created when a tenant's
// search returned zero results — see /listings) whose criteria the new listing satisfies,
// notifies each matching tenant once, and records that they've been told so a later
// approval of a similar listing doesn't spam them again.
export async function notifySavedSearchMatches(listing: Property): Promise<void> {
  const { savedSearches, notifications } = await getCollections();

  const optionalTextMatch = (path: string, value: string) => ({
    $or: [
      { [path]: { $exists: false } },
      { [path]: null },
      { [path]: new RegExp(`^${escapeRegex(value)}$`, "i") },
    ],
  });

  const candidates = await savedSearches
    .find({
      notifiedListingIds: { $ne: listing._id },
      $and: [
        optionalTextMatch("query.state", listing.location.state),
        optionalTextMatch("query.city", listing.location.city),
        optionalTextMatch("query.propertyType", listing.propertyType),
        {
          $or: [
            { "query.listingType": { $exists: false } },
            { "query.listingType": null },
            { "query.listingType": listing.listingType },
          ],
        },
        {
          $or: [
            { "query.maxPriceNGN": { $exists: false } },
            { "query.maxPriceNGN": null },
            { "query.maxPriceNGN": { $gte: listing.priceNGN } },
          ],
        },
      ],
    })
    .toArray();

  if (candidates.length === 0) return;

  const now = new Date();

  await notifications.insertMany(
    candidates.map((search) => ({
      userId: search.userId,
      type: "saved_search_match" as const,
      title: "A listing matching your search is now available",
      body: listing.title,
      listingId: listing._id,
      read: false,
      createdAt: now,
    })),
  );

  await savedSearches.updateMany(
    { _id: { $in: candidates.map((search) => search._id) } },
    { $push: { notifiedListingIds: listing._id! }, $set: { updatedAt: now } },
  );
}

// A new ticket needs a human at Reallow to see it — there's no email/SMS wired up yet
// (see src/lib/email.ts), so this is the whole notification loop for now: every
// admin/support account gets an in-app notification pointing at the ticket.
export async function notifyNewTicket(ticket: SupportTicket): Promise<void> {
  const { users, notifications } = await getCollections();
  const staff = await users.find({ role: { $in: ["admin", "support"] } }).project({ _id: 1 }).toArray();
  if (staff.length === 0) return;

  const now = new Date();
  await notifications.insertMany(
    staff.map((member) => ({
      userId: member._id as ObjectId,
      type: "ticket_new" as const,
      title: "New message to Reallow",
      body: ticket.subject,
      ticketId: ticket._id,
      read: false,
      createdAt: now,
    })),
  );
}

// Notifies whichever side of the thread didn't just send this reply.
export async function notifyTicketReply(ticket: SupportTicket, replierId: ObjectId, isStaffReply: boolean): Promise<void> {
  const { users, notifications } = await getCollections();
  const now = new Date();

  if (isStaffReply) {
    await notifications.insertOne({
      userId: ticket.userId,
      type: "ticket_reply",
      title: "Reallow replied to your message",
      body: ticket.subject,
      ticketId: ticket._id,
      read: false,
      createdAt: now,
    });
    return;
  }

  const staff = await users.find({ role: { $in: ["admin", "support"] } }).project({ _id: 1 }).toArray();
  const recipients = staff.filter((member) => member._id!.toString() !== replierId.toString());
  if (recipients.length === 0) return;

  await notifications.insertMany(
    recipients.map((member) => ({
      userId: member._id as ObjectId,
      type: "ticket_reply" as const,
      title: "New reply on a ticket",
      body: ticket.subject,
      ticketId: ticket._id,
      read: false,
      createdAt: now,
    })),
  );
}

// Tells the tenant whether the landlord approved or declined their interest in a listing.
export async function notifyLandlordDecision(ticket: SupportTicket, decision: "approved" | "declined"): Promise<void> {
  const { notifications } = await getCollections();

  await notifications.insertOne({
    userId: ticket.userId,
    type: "landlord_decision",
    title:
      decision === "approved"
        ? "The landlord is interested in you"
        : "The landlord has moved on from your application",
    body: ticket.subject,
    ticketId: ticket._id,
    read: false,
    createdAt: new Date(),
  });
}
