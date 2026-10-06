import type { Notification, SupportTicket } from "@/types/models";
import { isStaffRole } from "@/lib/roles";
import type { UserRole } from "@/types/models";
import type { MessageKey } from "@/lib/i18n/dictionaries";

// Where tapping a notification goes. Newer notifications carry their own `href`; older
// ones are resolved from what they reference. A ticket link depends on which side of THAT
// ticket this user is on, not their account's role — one account can be the applicant on
// one ticket and the listing's landlord on another.
export function notificationHref(
  notification: Notification,
  viewer: { id: string; role: UserRole },
  ticketById: Map<string, SupportTicket>,
): string {
  if (notification.href) return notification.href;

  if (notification.ticketId) {
    const ticketId = notification.ticketId.toString();
    if (isStaffRole(viewer.role)) return `/dashboard/support/tickets/${ticketId}`;
    const ticket = ticketById.get(ticketId);
    const isApplicant = ticket?.userId.toString() === viewer.id;
    return isApplicant ? `/dashboard/tenant/tickets/${ticketId}` : `/dashboard/applications/${ticketId}`;
  }
  if (notification.type.startsWith("inspection_")) return "/dashboard?panel=meetings";
  if (notification.listingId) return `/listings/${notification.listingId}`;
  return "/dashboard";
}

// The notification's title/body in the reader's language when it carries translation keys,
// otherwise the English text it was saved with.
export function notificationText(
  notification: Notification,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): { title: string; body: string } {
  const keys = notification.i18n;
  if (!keys) return { title: notification.title, body: notification.body };
  return {
    title: t(keys.title as MessageKey, keys.vars),
    body: t(keys.body as MessageKey, keys.vars),
  };
}
