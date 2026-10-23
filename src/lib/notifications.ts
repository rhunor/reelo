import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type { Agreement, InspectionBooking, Meeting, Property, PropertyRequest, SupportTicket } from "@/types/models";
import { sendListingReceivedEmail, sendListingReviewedEmail, sendVerificationVisitScheduledEmail } from "@/lib/email";
import { formatLagos } from "@/lib/time";
import { landlordRecipients } from "@/lib/reallow-landlord";
import type { Notification } from "@/types/models";

export const MEETINGS_HREF = "/dashboard?panel=meetings";
const ADMIN_APPLICATIONS_HREF = "/dashboard/admin/applications";

// A notification meant for a listing's landlord. For Reallow-owned listings (no real
// landlord logs in) it goes to every admin instead, pointing at Admin → Applications.
async function notifyLandlordSide(landlordId: ObjectId, base: Omit<Notification, "userId" | "_id">, adminHref?: string) {
  const { notifications } = await getCollections();
  const recipients = await landlordRecipients(landlordId);
  const forAdmins = !(recipients.length === 1 && recipients[0]!.equals(landlordId));
  if (recipients.length === 0) return;
  await notifications.insertMany(
    recipients.map((userId) => ({ ...base, userId, href: forAdmins ? (adminHref ?? ADMIN_APPLICATIONS_HREF) : base.href })),
  );
}

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
      i18n: { title: "notif.savedSearch.title", body: "notif.plain", vars: { text: listing.title } },
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

// The sender's own receipt for a general message to Reallow.
export async function notifyMessageReceived(ticket: SupportTicket): Promise<void> {
  const { notifications } = await getCollections();
  await notifications.insertOne({
    userId: ticket.userId,
    type: "ticket_new",
    title: "We've received your message",
    body: `“${ticket.subject}” — we'll reply as soon as possible. We'll notify you here and by email.`,
    i18n: { title: "notif.msgReceived.title", body: "notif.msgReceived.body", vars: { subject: ticket.subject } },
    ticketId: ticket._id,
    href: `/dashboard/tenant/tickets/${ticket._id}`,
    read: false,
    createdAt: new Date(),
  });
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
      i18n: { title: "notif.replied.title", body: "notif.plain", vars: { text: ticket.subject } },
      ticketId: ticket._id,
      href: `/dashboard/tenant/tickets/${ticket._id}`,
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

// Reallow just set (or changed) the verification inspection date after calling the
// landlord — this is the in-app half of that, prompting them to confirm it themselves.
export async function notifyVerificationInspectionScheduled(listing: Property, scheduledFor: Date): Promise<void> {
  const { notifications, users } = await getCollections();

  // One "confirm your visit" notification per listing: a new time replaces the old one
  // (and marks it unread again) instead of stacking up a notification per change.
  await notifications.updateOne(
    { userId: listing.landlordId, type: "verification_inspection_scheduled", listingId: listing._id },
    {
      $set: {
        title: "Confirm your property verification visit",
        body: `Reallow scheduled the verification visit for ${listing.title} on ${formatLagos(scheduledFor)} — confirm it, or ask for a different time.`,
        i18n: { title: "notif.visit.title", body: "notif.visit.body", vars: { title: listing.title, when: formatLagos(scheduledFor) } },
        href: `/dashboard/landlord/listings/${listing._id}/verification`,
        read: false,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  // Clear duplicates left over from before this was one-per-listing.
  const latest = await notifications.findOne(
    { userId: listing.landlordId, type: "verification_inspection_scheduled", listingId: listing._id },
    { sort: { createdAt: -1 }, projection: { _id: 1 } },
  );
  if (latest) {
    await notifications.deleteMany({
      userId: listing.landlordId,
      type: "verification_inspection_scheduled",
      listingId: listing._id,
      _id: { $ne: latest._id },
    });
  }

  const landlord = await users.findOne({ _id: listing.landlordId });
  if (landlord?.email) {
    await sendVerificationVisitScheduledEmail(
      landlord.email,
      landlord.firstName ?? landlord.name,
      listing.title,
      scheduledFor,
      listing._id!.toString(),
    );
  }
}

// Sent the moment a listing is submitted — there's no date to propose anymore; Reallow's
// agent reaches out to arrange the verification visit.
export async function notifyListingReceived(listing: Property): Promise<void> {
  await notifyAdmins("New listing submitted", `${listing.title} was submitted and needs a verification visit.`, "/dashboard/admin");
  const { notifications, users } = await getCollections();

  await notifications.insertOne({
    userId: listing.landlordId,
    type: "listing_received",
    title: "We've received your listing",
    body: `Good news — we've received ${listing.title}. A Reallow agent will contact you to arrange an in-person verification visit.`,
    i18n: { title: "notif.listingReceived.title", body: "notif.listingReceived.body", vars: { title: listing.title } },
    listingId: listing._id,
    href: "/dashboard",
    read: false,
    createdAt: new Date(),
  });

  const landlord = await users.findOne({ _id: listing.landlordId });
  if (landlord?.email) {
    await sendListingReceivedEmail(landlord.email, landlord.firstName ?? landlord.name, listing.title);
  }
}

// Admin approved (listing is now live) or rejected the listing after verification.
export async function notifyListingReviewed(listing: Property, outcome: "approved" | "rejected", reason?: string): Promise<void> {
  const { notifications, users } = await getCollections();
  const approved = outcome === "approved";

  await notifications.insertOne({
    userId: listing.landlordId,
    type: approved ? "listing_approved" : "listing_rejected",
    title: approved ? "Your listing is live" : "Your listing wasn't approved",
    body: approved
      ? `${listing.title} passed verification and is now live on Reallow. We'll notify you when someone applies.`
      : `${listing.title} wasn't approved: ${reason}. You can fix it and resubmit from your dashboard.`,
    i18n: approved
      ? { title: "notif.approved.title", body: "notif.approved.body", vars: { title: listing.title } }
      : { title: "notif.rejected.title", body: "notif.rejected.body", vars: { title: listing.title, reason: reason ?? "" } },
    listingId: listing._id,
    href: approved ? `/listings/${listing._id}` : "/dashboard",
    read: false,
    createdAt: new Date(),
  });

  const landlord = await users.findOne({ _id: listing.landlordId });
  if (landlord?.email) {
    await sendListingReviewedEmail(
      landlord.email,
      landlord.firstName ?? landlord.name,
      listing.title,
      listing._id!.toString(),
      outcome,
      reason,
    );
  }
}

// The landlord said the scheduled time doesn't work — every admin and field agent hears
// about it so someone calls them back to rearrange.
export async function notifyVerificationVisitDeclined(listing: Property): Promise<void> {
  const { notifications, users } = await getCollections();
  const staff = await users.find({ role: { $in: ["admin", "staff"] } }).project({ _id: 1 }).toArray();
  if (staff.length === 0) return;

  const now = new Date();
  await notifications.insertMany(
    staff.map((member) => ({
      userId: member._id as ObjectId,
      type: "verification_inspection_declined" as const,
      title: "Landlord needs a different verification time",
      body: `${listing.title} — call the landlord to rearrange the visit.`,
      listingId: listing._id,
      read: false,
      createdAt: now,
    })),
  );
}

// Either party can propose or counter an inspection meeting time (see
// src/app/api/inspection-bookings/[id]/respond/route.ts) — notify whichever party didn't
// just make the proposal.
export async function notifyInspectionProposal(booking: InspectionBooking, toUserId: ObjectId): Promise<void> {
  const { notifications } = await getCollections();

  await notifications.insertOne({
    userId: toUserId,
    type: "inspection_time_proposed",
    title: "New inspection time suggested",
    body: `A new time was suggested: ${formatLagos(booking.proposedTime!)}. Accept or suggest another.`,
    i18n: { title: "notif.inspProposed.title", body: "notif.inspProposed.body", vars: { when: formatLagos(booking.proposedTime!) } },
    listingId: booking.listingId,
    href: MEETINGS_HREF,
    read: false,
    createdAt: new Date(),
  });
}

// Both parties get told once a time is actually agreed — this is the point Reallow's
// agent takes over logistics (see the copy in src/components/inspection-negotiation.tsx).
export async function notifyInspectionConfirmed(booking: InspectionBooking): Promise<void> {
  const { notifications } = await getCollections();
  const when = formatLagos(booking.scheduledFor!);

  await notifications.insertMany([
    {
      userId: booking.tenantId,
      type: "inspection_time_confirmed",
      title: "Inspection confirmed",
      body: `Confirmed for ${when}. Reallow's agent will contact you with how to get to the meeting point.`,
      i18n: { title: "notif.inspConfirmed.title", body: "notif.inspConfirmed.tenant", vars: { when } },
      listingId: booking.listingId,
      href: MEETINGS_HREF,
      read: false,
      createdAt: new Date(),
    },
    {
      userId: booking.landlordId,
      type: "inspection_time_confirmed",
      title: "Inspection confirmed",
      body: `Confirmed for ${when}. Reallow's agent will bring the tenant to you.`,
      i18n: { title: "notif.inspConfirmed.title", body: "notif.inspConfirmed.landlord", vars: { when } },
      listingId: booking.listingId,
      href: MEETINGS_HREF,
      read: false,
      createdAt: new Date(),
    },
  ]);
}

// Tells the applicant whether the landlord accepted or declined their interest in a
// listing. An acceptance links straight into booking a meeting or inspection.
export async function notifyLandlordDecision(ticket: SupportTicket, decision: "approved" | "declined"): Promise<void> {
  await notifyAdmins(decision === "approved" ? "Application accepted" : "Application declined", `The landlord ${decision === "approved" ? "accepted" : "declined"} an application: ${ticket.subject}.`, "/dashboard/admin/listings");
  const { notifications } = await getCollections();

  await notifications.insertOne({
    userId: ticket.userId,
    type: "landlord_decision",
    title:
      decision === "approved"
        ? "The landlord accepted your application"
        : "The landlord has moved on from your application",
    body:
      decision === "approved"
        ? `${ticket.subject} — you can now book a meeting.`
        : ticket.subject,
    ticketId: ticket._id,
    i18n:
      decision === "approved"
        ? { title: "notif.accepted.title", body: "notif.accepted.body", vars: { subject: ticket.subject } }
        : { title: "notif.declined.title", body: "notif.plain", vars: { text: ticket.subject } },
    href: decision === "approved" ? `${MEETINGS_HREF}&ticket=${ticket._id}` : undefined,
    read: false,
    createdAt: new Date(),
  });
}

// Sent the moment an account is created — a welcome, then a nudge to finish the profile.
export async function notifyWelcome(userId: ObjectId, firstName: string): Promise<void> {
  const { notifications } = await getCollections();
  const now = new Date();

  await notifications.insertMany([
    {
      userId,
      type: "welcome",
      title: `Welcome to Reallow, ${firstName}!`,
      body: "Thanks for joining. Every listing here is verified in person by Reallow, and every payment goes through us — no agents, no surprises.",
      i18n: { title: "notif.welcome.title", body: "notif.welcome.body", vars: { name: firstName } },
      href: "/dashboard",
      read: false,
      createdAt: now,
    },
    {
      userId,
      type: "complete_profile",
      title: "Complete your profile",
      body: "Add your photo and a few details so landlords and Reallow know who they're dealing with.",
      i18n: { title: "dash.completeProfile", body: "notif.completeProfile.body" },
      href: "/dashboard/settings#profile",
      read: false,
      // A millisecond later so it sorts directly under the welcome message.
      createdAt: new Date(now.getTime() + 1),
    },
  ]);
}

// Someone applied for one of this landlord's listings — tapping it opens the applicant's
// shared profile with accept/reject.
export async function notifyNewApplication(ticket: SupportTicket, listing: Property): Promise<void> {
  await notifyAdmins("New application", `Someone applied for ${listing.title}.`, "/dashboard/admin/listings");
  await notifyLandlordSide(
    listing.landlordId,
    {
    type: "new_application",
    title: "Someone applied for your property",
    body: `New application for ${listing.title}. View their profile to accept or decline.`,
    i18n: { title: "notif.newApp.title", body: "notif.newApp.body", vars: { title: listing.title } },
    listingId: listing._id,
    ticketId: ticket._id,
    href: `/dashboard/applications/${ticket._id}`,
    read: false,
    createdAt: new Date(),
    },
    // Admins open the same review page.
    `/dashboard/applications/${ticket._id}`,
  );
}

const MEETING_NOUN: Record<Meeting["kind"], string> = { inspection: "inspection", meeting: "meeting" };

export async function notifyMeetingProposed(meeting: Meeting, toUserId: ObjectId, isCounter: boolean): Promise<void> {
  await notifyAdmins(isCounter ? "Meeting time changed" : "Meeting requested", `${await titleOfListing(meeting.listingId)} — proposed for ${formatLagos(meeting.proposedTime)}.`, "/dashboard/admin/applications");
  const { notifications } = await getCollections();
  const noun = MEETING_NOUN[meeting.kind];
  // The applicant has to pay the inspection fee before they can accept a landlord's time.
  const needsFee = toUserId.equals(meeting.tenantId) && Boolean(meeting.feeNGN) && !meeting.paidAt;
  const notice = {
    type: "meeting_proposed" as const,
    title: isCounter ? `A different ${noun} time was suggested` : `New ${noun} request`,
    body: needsFee
      ? `Proposed for ${formatLagos(meeting.proposedTime)}. Pay the ₦${meeting.feeNGN!.toLocaleString()} inspection fee to accept, or suggest another time.`
      : `Proposed for ${formatLagos(meeting.proposedTime)}. Accept, decline, or suggest another time.`,
    i18n: {
      title: `notif.req.${isCounter ? "counter" : "new"}.${meeting.kind}`,
      body: needsFee ? "notif.req.bodyPay" : "notif.req.body",
      vars: { when: formatLagos(meeting.proposedTime), fee: `₦${(meeting.feeNGN ?? 0).toLocaleString()}` },
    },
    listingId: meeting.listingId,
    href: MEETINGS_HREF,
    read: false,
    createdAt: new Date(),
  };

  if (toUserId.equals(meeting.landlordId)) await notifyLandlordSide(meeting.landlordId, notice);
  else await notifications.insertOne({ ...notice, userId: toUserId });
}

export async function notifyMeetingConfirmed(meeting: Meeting): Promise<void> {
  await notifyAdmins("Meeting confirmed", `${await titleOfListing(meeting.listingId)} — ${formatLagos(meeting.scheduledFor ?? meeting.proposedTime)}.`, "/dashboard/staff");
  const { notifications } = await getCollections();
  const when = formatLagos(meeting.scheduledFor!);
  const isInspection = meeting.kind === "inspection";
  const now = new Date();

  await notifications.insertOne({
    userId: meeting.tenantId,
    type: "meeting_confirmed",
    title: isInspection ? "Inspection time agreed" : "Meeting confirmed",
    body: isInspection
      ? `Agreed for ${when}. Pay the inspection fee to lock it in — Reallow's agent will then contact you.`
      : `Your meeting is confirmed for ${when}.`,
    i18n: {
      title: isInspection ? "notif.agreed.title" : "notif.meetingConfirmed.title",
      body: isInspection ? "notif.agreed.tenant" : "notif.meetingConfirmed.body",
      vars: { when },
    },
    listingId: meeting.listingId,
    href: MEETINGS_HREF,
    read: false,
    createdAt: now,
  });
  await notifyLandlordSide(meeting.landlordId,
    {
      type: "meeting_confirmed" as const,
      title: isInspection ? "Inspection time agreed" : "Meeting confirmed",
      body: isInspection
        ? `Agreed for ${when}. It goes ahead once the applicant pays the inspection fee.`
        : `Your meeting is confirmed for ${when}.`,
      i18n: {
        title: isInspection ? "notif.agreed.title" : "notif.meetingConfirmed.title",
        body: isInspection ? "notif.agreed.landlord" : "notif.meetingConfirmed.body",
        vars: { when },
      },
      listingId: meeting.listingId,
      href: MEETINGS_HREF,
      read: false,
      createdAt: now,
    });
}

export async function notifyMeetingDeclined(meeting: Meeting, toUserId: ObjectId): Promise<void> {
  await notifyAdmins("Meeting declined", `A meeting request for ${await titleOfListing(meeting.listingId)} was declined.`, "/dashboard/admin/applications");
  const { notifications } = await getCollections();
  // A paid applicant doesn't pay again — the fee carries over to the rescheduled meeting.
  const feeCarries = toUserId.equals(meeting.tenantId) && Boolean(meeting.paidAt);
  const notice = {
    type: "meeting_declined" as const,
    title: `${meeting.kind === "inspection" ? "Inspection" : "Meeting"} request declined`,
    body: feeCarries
      ? `The proposed time (${formatLagos(meeting.proposedTime)}) was declined. Book a new time from Meetings — the inspection fee you paid carries over.`
      : `The proposed time (${formatLagos(meeting.proposedTime)}) was declined. You can book a new time from Meetings.`,
    i18n: {
      title: `notif.req.declined.${meeting.kind}`,
      body: feeCarries ? "notif.req.declinedBodyPaid" : "notif.req.declinedBody",
      vars: { when: formatLagos(meeting.proposedTime) },
    },
    listingId: meeting.listingId,
    href: MEETINGS_HREF,
    read: false,
    createdAt: new Date(),
  };
  if (toUserId.equals(meeting.landlordId)) await notifyLandlordSide(meeting.landlordId, notice);
  else await notifications.insertOne({ ...notice, userId: toUserId });
}

// The applicant paid for an agreed inspection — the landlord hears it's on, and every
// field agent/admin sees there's a visit to staff.
// A paid visit is now on the calendar: field staff are told so an agent can attend. For
// the older inspection flow the landlord hears too; for meetings the landlord already got
// "Meeting confirmed", so `landlord: false` skips the duplicate.
export async function notifyMeetingPaid(meeting: Meeting, { landlord = true }: { landlord?: boolean } = {}): Promise<void> {
  const { notifications, users } = await getCollections();
  const when = formatLagos(meeting.scheduledFor ?? meeting.proposedTime);
  const now = new Date();
  const staff = await users.find({ role: { $in: ["admin", "staff"] } }).project({ _id: 1 }).toArray();
  const toLandlord = landlord
    ? [
        {
          userId: meeting.landlordId,
          type: "meeting_paid" as const,
          title: "Inspection is on",
          body: `The inspection fee is paid — ${when}. Reallow's agent will bring the applicant to you.`,
          i18n: { title: "notif.paid.title", body: "notif.paid.body", vars: { when } },
          listingId: meeting.listingId,
          href: MEETINGS_HREF,
          read: false,
          createdAt: now,
        },
      ]
    : [];

  await notifications.insertMany([
    ...toLandlord,
    ...staff.map((member) => ({
      userId: member._id as ObjectId,
      type: "meeting_paid" as const,
      title: "Paid visit to attend",
      body: `${meeting.kind === "meeting" ? "Meeting" : "Inspection"} booked for ${when} — the fee is paid, an agent should attend.`,
      listingId: meeting.listingId,
      href: "/dashboard/staff",
      read: false,
      createdAt: now,
    })),
  ]);
}

export async function notifyWalletFunded(userId: ObjectId, amountNGN: number): Promise<void> {
  await notifyAdmins("Wallet funded", `A user added ₦${amountNGN.toLocaleString()} to their Reallow wallet.`, `/dashboard/admin/users/${userId}`);
  const { notifications } = await getCollections();

  await notifications.insertOne({
    userId,
    type: "wallet_funded",
    title: "Wallet funded",
    body: `₦${amountNGN.toLocaleString()} was added to your Reallow wallet.`,
    i18n: { title: "notif.wallet.title", body: "notif.wallet.body", vars: { amount: `₦${amountNGN.toLocaleString()}` } },
    href: "/dashboard?panel=wallet",
    read: false,
    createdAt: new Date(),
  });
}

const LISTING_STATUS_MESSAGE = {
  hide: { title: "Your listing was taken down", body: "Reallow has taken this listing off the site." },
  show: { title: "Your listing is visible again", body: "Reallow has put this listing back on the site." },
  rented: { title: "Listing marked as rented", body: "Reallow marked this listing as rented — it no longer appears in search." },
  sold: { title: "Listing marked as sold", body: "Reallow marked this listing as sold — it no longer appears in search." },
} as const;

// Tells the owner when Reallow changes their listing's visibility, with any note left.
export async function notifyListingStatusChanged(
  listing: Property,
  action: keyof typeof LISTING_STATUS_MESSAGE,
  note?: string,
): Promise<void> {
  const { notifications } = await getCollections();
  const message = LISTING_STATUS_MESSAGE[action];
  await notifications.insertOne({
    userId: listing.landlordId,
    type: "listing_status_changed",
    title: message.title,
    body: `${listing.title}: ${message.body}${note ? ` Note from Reallow: ${note}` : ""}`,
    i18n: {
      title: `notif.status.${action}.title`,
      body: note ? `notif.status.${action}.bodyNote` : `notif.status.${action}.body`,
      vars: { title: listing.title, note: note ?? "" },
    },
    listingId: listing._id,
    href: "/dashboard",
    read: false,
    createdAt: new Date(),
  });
}

// A new report needs a human — every admin hears about it (the queue is admin-only).
export async function notifyNewReport(report: { _id?: ObjectId; targetType: "user" | "listing"; reason: string }): Promise<void> {
  const { users, notifications } = await getCollections();
  const staff = await users.find({ role: "admin" }).project({ _id: 1 }).toArray();
  if (staff.length === 0) return;
  const now = new Date();
  await notifications.insertMany(
    staff.map((member) => ({
      userId: member._id as ObjectId,
      type: "report_new" as const,
      title: report.targetType === "listing" ? "A property was reported" : "A user was reported",
      body: `${report.reason} — review it in Reports.`,
      href: "/dashboard/admin/reports",
      read: false,
      createdAt: now,
    })),
  );
}

const ROLE_NOTICE: Record<string, { title: string; body: string; href: string }> = {
  staff: { title: "You're now Reallow field staff", body: "Your dashboard now shows the properties to verify and inspections to attend.", href: "/dashboard/staff" },
  support: { title: "You're now on Reallow support", body: "Your dashboard now shows the support queue.", href: "/dashboard/support" },
  admin: { title: "You're now a Reallow admin", body: "You now have access to the admin dashboard.", href: "/dashboard/admin" },
  customer: { title: "Your account type changed", body: "Your account is now a regular Reallow account.", href: "/dashboard" },
};

export async function notifyRoleChanged(userId: ObjectId, role: string): Promise<void> {
  const { notifications } = await getCollections();
  const notice = ROLE_NOTICE[role] ?? ROLE_NOTICE.customer!;
  await notifications.insertOne({
    userId,
    type: "role_changed",
    title: notice.title,
    body: notice.body,
    i18n: { title: `notif.role.${ROLE_NOTICE[role] ? role : "customer"}.title`, body: `notif.role.${ROLE_NOTICE[role] ? role : "customer"}.body` },
    href: notice.href,
    read: false,
    createdAt: new Date(),
  });
}

// An ID number is waiting for a manual check (automatic verification isn't switched on yet).
export async function notifyIdAwaitingReview(userId: ObjectId, name: string, idLabel: string): Promise<void> {
  const { users, notifications } = await getCollections();
  const admins = await users.find({ role: "admin" }).project({ _id: 1 }).toArray();
  if (admins.length === 0) return;
  const now = new Date();
  await notifications.insertMany(
    admins.map((admin) => ({
      userId: admin._id as ObjectId,
      type: "id_review" as const,
      title: "ID waiting for verification",
      body: `${name} submitted their ${idLabel}. Check it and mark them verified.`,
      href: `/dashboard/admin/users/${userId}`,
      read: false,
      createdAt: now,
    })),
  );
}

export async function notifyIdentityVerified(userId: ObjectId): Promise<void> {
  const { notifications } = await getCollections();
  await notifications.insertOne({
    userId,
    type: "id_review",
    title: "Your identity is verified",
    body: "You can now apply for properties, book inspections, and get your listings published.",
    i18n: { title: "notif.idVerified.title", body: "notif.idVerified.body" },
    href: "/dashboard",
    read: false,
    createdAt: new Date(),
  });
}

// The meeting was declined after the applicant paid — the fee went back to their wallet.
export async function notifyMeetingRefunded(meeting: Meeting, amountNGN: number): Promise<void> {
  await notifyAdmins("Meeting fee refunded", `₦${amountNGN.toLocaleString()} was refunded to an applicant's wallet (meeting cancelled).`, "/dashboard/admin");
  const { notifications } = await getCollections();
  const amount = `₦${amountNGN.toLocaleString()}`;
  await notifications.insertOne({
    userId: meeting.tenantId,
    type: "meeting_refunded",
    title: "Inspection fee refunded",
    body: `The meeting didn't go ahead, so your ${amount} inspection fee is back in your Reallow wallet.`,
    i18n: { title: "notif.refund.title", body: "notif.refund.body", vars: { amount } },
    listingId: meeting.listingId,
    href: "/dashboard?panel=wallet",
    read: false,
    createdAt: new Date(),
  });
}

// One side cancelled a meeting; the other side hears about it.
export async function notifyMeetingCancelled(meeting: Meeting, toUserId: ObjectId): Promise<void> {
  await notifyAdmins("Meeting cancelled", `The meeting for ${await titleOfListing(meeting.listingId)} on ${formatLagos(meeting.scheduledFor ?? meeting.proposedTime)} was cancelled.`, "/dashboard/admin/applications");
  const { notifications } = await getCollections();
  const when = formatLagos(meeting.scheduledFor ?? meeting.proposedTime);
  const notice = {
    type: "meeting_declined" as const,
    title: "Meeting cancelled",
    body: `The meeting on ${when} was cancelled. You can book a new time from Meetings.`,
    i18n: { title: "notif.cancelled.title", body: "notif.cancelled.body", vars: { when } },
    listingId: meeting.listingId,
    href: MEETINGS_HREF,
    read: false,
    createdAt: new Date(),
  };
  if (toUserId.equals(meeting.landlordId)) await notifyLandlordSide(meeting.landlordId, notice);
  else await notifications.insertOne({ ...notice, userId: toUserId });
}

// Someone asked Reallow's agents to find them a property — every admin hears about it, and a
// signed-in requester gets a confirmation.
export async function notifyPropertyRequest(request: PropertyRequest): Promise<void> {
  const { notifications, users } = await getCollections();
  const admins = await users.find({ role: "admin" }).project({ _id: 1 }).toArray();
  const what = `${request.propertyType} for ${request.listingType === "rent" ? "rent" : "sale"}`;
  const where = [request.city, request.state].filter(Boolean).join(", ");
  const now = new Date();
  const notices: Omit<Notification, "_id">[] = admins.map((admin) => ({
    userId: admin._id as ObjectId,
    type: "property_request" as const,
    title: "New property request",
    body: `${request.name} is looking for a ${what} in ${where}.`,
    href: "/dashboard/admin/requests",
    read: false,
    createdAt: now,
  }));
  if (request.userId) {
    notices.push({
      userId: request.userId,
      type: "property_request",
      title: "We've got your property request",
      body: `Reallow's agents are looking for a ${what} in ${where} and will contact you.`,
      i18n: {
        title: "notif.propRequest.title",
        body: "notif.propRequest.body",
        vars: { type: request.propertyType, where },
      },
      href: "/listings",
      read: false,
      createdAt: now,
    });
  }
  if (notices.length) await notifications.insertMany(notices);
}

const agreementHref = (agreement: Agreement) => `/agreements/${agreement._id}`;

async function listingTitle(agreement: Agreement): Promise<string> {
  const { properties } = await getCollections();
  return (await properties.findOne({ _id: agreement.listingId }, { projection: { title: 1 } }))?.title ?? "the property";
}

// The landlord accepted an applicant and asked them to pay: the applicant reviews and signs
// the agreement, then pays — all from one page.
export async function notifyPaymentRequested(agreement: Agreement): Promise<void> {
  await notifyAdmins("Payment requested", `A landlord asked an applicant to pay for ${await listingTitle(agreement)}.`, "/dashboard/admin/agreements");
  const { notifications } = await getCollections();
  const title = await listingTitle(agreement);
  await notifications.insertOne({
    userId: agreement.tenantId,
    type: "payment_requested",
    title: "You can now pay for your new home",
    body: `The landlord of ${title} is ready to go ahead with you. Review and sign the agreement, then complete payment through Reallow.`,
    i18n: { title: "notif.payReq.title", body: "notif.payReq.body", vars: { title } },
    listingId: agreement.listingId,
    href: agreementHref(agreement),
    read: false,
    createdAt: new Date(),
  });
}

// Another applicant completed payment first. If this applicant had also just paid, their
// money was returned to their wallet (refundedNGN).
export async function notifyPaymentSuperseded(agreement: Agreement, refundedNGN?: number): Promise<void> {
  const { notifications } = await getCollections();
  const title = await listingTitle(agreement);
  const amount = refundedNGN ? `₦${refundedNGN.toLocaleString()}` : "";
  await notifications.insertOne({
    userId: agreement.tenantId,
    type: "payment_superseded",
    title: "Someone completed payment before you",
    body: refundedNGN
      ? `Another applicant completed payment for ${title} just before you, so your ${amount} has been returned to your Reallow wallet. Why not try other properties?`
      : `Another applicant completed payment for ${title} before you. Why not try other properties?`,
    i18n: {
      title: "notif.superseded.title",
      body: refundedNGN ? "notif.superseded.bodyRefund" : "notif.superseded.body",
      vars: { title, amount },
    },
    listingId: agreement.listingId,
    href: "/listings",
    read: false,
    createdAt: new Date(),
  });
}

// Payment completed: the payer gets a confirmation and the landlord side hears the property
// is now rented/sold (Reallow then pays them out).
export async function notifyPropertyPaid(agreement: Agreement, amountNGN: number): Promise<void> {
  await notifyAdmins("Payment completed", `₦${amountNGN.toLocaleString()} was paid for ${await listingTitle(agreement)} — it's now marked ${agreement.kind === "sale" ? "sold" : "rented"}.`, "/dashboard/admin/agreements");
  const { notifications } = await getCollections();
  const title = await listingTitle(agreement);
  const amount = `₦${amountNGN.toLocaleString()}`;
  const isSale = agreement.kind === "sale";
  const now = new Date();
  await notifications.insertOne({
    userId: agreement.tenantId,
    type: "property_paid",
    title: "Payment complete",
    body: `Your ${amount} payment for ${title} is complete. Reallow will be in touch about handover.`,
    i18n: { title: "notif.paidDone.title", body: "notif.paidDone.body", vars: { title, amount } },
    listingId: agreement.listingId,
    href: agreementHref(agreement),
    read: false,
    createdAt: now,
  });
  await notifyLandlordSide(agreement.landlordId, {
    type: "property_paid" as const,
    title: isSale ? "Your property has been paid for" : "Your tenant has paid",
    body: `Payment for ${title} is complete and the listing is now marked ${isSale ? "sold" : "rented"}. Reallow will pay you out.`,
    i18n: {
      title: isSale ? "notif.ownerPaid.titleSale" : "notif.ownerPaid.title",
      body: isSale ? "notif.ownerPaid.bodySale" : "notif.ownerPaid.body",
      vars: { title },
    },
    listingId: agreement.listingId,
    href: agreementHref(agreement),
    read: false,
    createdAt: now,
  });
}

// Keeps Reallow's admins on top of everything happening on the app: a bell notification for
// each event (signups, listings, applications, meetings, payments…). In-app only — see
// DEDICATED_EMAIL in lib/notification-email.ts for why these aren't also emailed.
export async function notifyAdmins(title: string, body: string, href = "/dashboard/admin"): Promise<void> {
  try {
    const { notifications, users } = await getCollections();
    const admins = await users.find({ role: "admin" }).project({ _id: 1 }).toArray();
    if (admins.length === 0) return;
    const now = new Date();
    await notifications.insertMany(
      admins.map((admin) => ({
        userId: admin._id as ObjectId,
        type: "admin_activity" as const,
        title,
        body,
        href,
        read: false,
        createdAt: now,
      })),
    );
  } catch (error) {
    console.error("[notifyAdmins] failed:", error);
  }
}

// The applicant withdrew — the landlord side hears, and so do admins.
export async function notifyApplicationWithdrawn(ticket: SupportTicket, listing: Property): Promise<void> {
  await notifyLandlordSide(listing.landlordId, {
    type: "application_withdrawn" as const,
    title: "An applicant withdrew their application",
    body: `An applicant withdrew their application for ${listing.title}. Any meetings with them have been cancelled.`,
    i18n: { title: "notif.withdrawn.title", body: "notif.withdrawn.body", vars: { title: listing.title } },
    listingId: listing._id,
    href: "/dashboard/landlord/candidates",
    read: false,
    createdAt: new Date(),
  });
  await notifyAdmins("Application withdrawn", `An applicant withdrew their application for ${listing.title}.`, "/dashboard/admin/listings");
}

// The owner took their property off the market: people with an active application hear it's
// no longer available, and admins are told.
export async function notifyListingUnlisted(listing: Property, applicantIds: ObjectId[]): Promise<void> {
  const { notifications } = await getCollections();
  const now = new Date();
  if (applicantIds.length) {
    await notifications.insertMany(
      applicantIds.map((userId) => ({
        userId,
        type: "listing_unlisted" as const,
        title: "A property you applied for is no longer available",
        body: `The owner has taken ${listing.title} off the market. Any meetings for it have been cancelled. Why not try other properties?`,
        i18n: { title: "notif.unlisted.title", body: "notif.unlisted.body", vars: { title: listing.title } },
        listingId: listing._id,
        href: "/listings",
        read: false,
        createdAt: now,
      })),
    );
  }
  await notifyAdmins("Listing unlisted by owner", `${listing.title} was taken off the market by its owner.`, "/dashboard/admin/listings");
}

async function titleOfListing(listingId: ObjectId): Promise<string> {
  const { properties } = await getCollections();
  return (await properties.findOne({ _id: listingId }, { projection: { title: 1 } }))?.title ?? "a property";
}
