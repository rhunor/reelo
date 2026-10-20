import crypto from "crypto";
import type { Filter, ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { appBaseUrl } from "@/lib/email";
import type { EmailAudience, User } from "@/types/models";

export const AUDIENCES: { id: EmailAudience; label: string; hint: string }[] = [
  { id: "newsletter", label: "Newsletter subscribers", hint: "People who ticked “Keep me updated about Reallow” — use for news and promotions." },
  { id: "all", label: "All users", hint: "Every customer account — only for important service announcements." },
  { id: "owners", label: "Property owners", hint: "Anyone who has listed a property." },
  { id: "applicants", label: "Tenants & buyers", hint: "Anyone who has applied for a property." },
  { id: "staff", label: "Reallow staff", hint: "Admins, support and field staff." },
];

// Marketing (newsletter) emails carry an unsubscribe link, as the NDPA requires.
export const isMarketing = (audience: EmailAudience) => audience === "newsletter";

// Who an audience reaches. Blocked accounts and accounts without an email never do.
export async function audienceRecipients(audience: EmailAudience, verifiedOnly: boolean) {
  const { users, properties, tickets } = await getCollections();
  const filter: Filter<User> = { email: { $exists: true, $ne: "" }, status: { $ne: "banned" } };
  if (verifiedOnly) filter.verifiedBadge = true;
  const customers = { $in: ["user", "tenant", "landlord"] as User["role"][] };

  if (audience === "newsletter") {
    filter.role = customers;
    filter.newsletterOptIn = { $ne: false };
  } else if (audience === "all") {
    filter.role = customers;
  } else if (audience === "staff") {
    filter.role = { $in: ["admin", "support", "staff"] };
  } else if (audience === "owners") {
    filter._id = { $in: (await properties.distinct("landlordId")) as ObjectId[] };
  } else if (audience === "applicants") {
    filter._id = { $in: (await tickets.distinct("userId", { listingId: { $exists: true } })) as ObjectId[] };
  }
  return users.find(filter, { projection: { email: 1, name: 1, firstName: 1 } }).toArray();
}

const secret = () => process.env.AUTH_SECRET || "reallow-unsubscribe";
const sign = (userId: string) => crypto.createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);

export function unsubscribeUrl(userId: ObjectId): string {
  const id = userId.toString();
  return `${appBaseUrl()}/unsubscribe?u=${id}&t=${sign(id)}`;
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const expected = sign(userId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
