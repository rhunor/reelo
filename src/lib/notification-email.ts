import { getCollections } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import type { Notification, NotificationType } from "@/types/models";

// Notifications that already go out as their own dedicated email (or whose email would only
// duplicate one) — everything else is also emailed. See withNotificationEmails in db.ts.
const DEDICATED_EMAIL: ReadonlySet<NotificationType> = new Set<NotificationType>([
  "listing_received", // sendListingReceivedEmail
  "listing_approved", // sendListingReviewedEmail
  "listing_rejected",
  "verification_inspection_scheduled", // sendVerificationVisitScheduledEmail
  "welcome", // the verify-your-email email covers sign-up
  "ticket_new", // support inbox email + sendMessageReceivedEmail
  "ticket_reply", // sendSupportReplyEmail
  "report_new", // support inbox email
]);

// Emails the people these notifications are for. Never throws — an email problem must not
// break whatever created the notification.
export async function emailNotifications(docs: Array<Omit<Notification, "_id"> | Notification>): Promise<void> {
  try {
    const wanted = docs.filter((doc) => !DEDICATED_EMAIL.has(doc.type));
    if (wanted.length === 0) return;
    const { users } = await getCollections();
    const recipients = await users
      .find(
        { _id: { $in: [...new Map(wanted.map((d) => [d.userId.toString(), d.userId])).values()] } },
        { projection: { email: 1, name: 1, firstName: 1, status: 1 } },
      )
      .toArray();
    const byId = new Map(recipients.map((u) => [u._id!.toString(), u]));
    for (const doc of wanted) {
      const user = byId.get(doc.userId.toString());
      if (!user?.email || user.status === "banned") continue;
      await sendNotificationEmail(user.email, user.firstName ?? user.name, { title: doc.title, body: doc.body, href: doc.href });
    }
  } catch (error) {
    console.error("[notification-email] failed:", error);
  }
}
