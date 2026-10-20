import type { Collection } from "mongodb";
import { after } from "next/server";
import { getMongoClientPromise } from "@/lib/mongodb";
import { ANALYTICS_RETENTION_S } from "@/lib/consent";
import type {
  AnalyticsEvent,
  ConsentEvent,
  EmailCampaign,
  PropertyRequest,
  Agreement,
  InspectionBooking,
  ListingReview,
  Meeting,
  MeetingFeedback,
  Notification,
  Property,
  ReferralCommission,
  Report,
  SavedSearch,
  SupportTicket,
  Transaction,
  User,
  WithdrawalRequest,
} from "@/types/models";

const dbName = process.env.MONGODB_DB || "reallow";

export async function getDb() {
  const client = await getMongoClientPromise();
  return client.db(dbName);
}

// Indexes for the queries every dashboard page runs (status queues, a user's
// notifications, lookups by email/referral code). createIndex is a no-op when the index
// already exists, so this runs once per server instance, in the background — never
// blocking a request. None are unique, so existing data can't make them fail.
let indexesRequested = false;
function ensureIndexes(db: Awaited<ReturnType<typeof getDb>>) {
  if (indexesRequested) return;
  indexesRequested = true;
  const specs: Array<[string, Record<string, 1 | -1>, { expireAfterSeconds?: number }?]> = [
    ["analyticsEvents", { createdAt: 1 }, { expireAfterSeconds: ANALYTICS_RETENTION_S }],
    ["analyticsEvents", { path: 1, createdAt: -1 }],
    ["consentEvents", { createdAt: -1 }],
    ["propertyRequests", { status: 1, createdAt: -1 }],
    ["users", { email: 1 }],
    ["users", { phone: 1 }],
    ["users", { referralCode: 1 }],
    ["users", { role: 1, createdAt: -1 }],
    ["properties", { status: 1, createdAt: 1 }],
    ["properties", { landlordId: 1 }],
    ["notifications", { userId: 1, createdAt: -1 }],
    ["notifications", { userId: 1, read: 1 }],
    ["meetings", { status: 1, kind: 1 }],
    ["meetings", { landlordId: 1 }],
    ["meetings", { tenantId: 1 }],
    ["inspectionBookings", { status: 1 }],
    ["tickets", { status: 1 }],
    ["tickets", { userId: 1 }],
    ["tickets", { listingId: 1 }],
    ["transactions", { payerId: 1 }],
    ["transactions", { payeeId: 1 }],
    ["agreements", { "payment.status": 1 }],
    ["meetingFeedback", { userId: 1, targetType: 1, targetId: 1 }],
    ["reports", { status: 1 }],
    ["withdrawalRequests", { status: 1 }],
    ["referralCommissions", { status: 1 }],
  ];
  void Promise.all(specs.map(([name, keys, options]) => db.collection(name).createIndex(keys, options ?? {}))).catch((error) => {
    indexesRequested = false; // try again on a later request
    console.error("[db] creating indexes failed:", error);
  });
}

// Every notification saved anywhere in the app is also emailed to its recipient (see
// lib/notification-email.ts for the few that already have their own email). Sent after the
// response so it never slows a page down; outside a request (scripts) it just runs.
function withNotificationEmails(collection: Collection<Notification>): Collection<Notification> {
  const insertOne = collection.insertOne.bind(collection);
  const insertMany = collection.insertMany.bind(collection);
  const queue = (docs: Notification[]) => {
    const send = () => import("@/lib/notification-email").then((m) => m.emailNotifications(docs));
    try {
      after(send);
    } catch {
      void send().catch(() => {});
    }
  };
  collection.insertOne = (async (doc: Notification, options?: Parameters<typeof insertOne>[1]) => {
    const result = await insertOne(doc, options);
    queue([doc]);
    return result;
  }) as typeof collection.insertOne;
  collection.insertMany = (async (docs: Notification[], options?: Parameters<typeof insertMany>[1]) => {
    const result = await insertMany(docs, options);
    queue(docs);
    return result;
  }) as typeof collection.insertMany;
  return collection;
}

export async function getCollections() {
  const db = await getDb();
  ensureIndexes(db);
  return {
    users: db.collection<User>("users"),
    properties: db.collection<Property>("properties"),
    agreements: db.collection<Agreement>("agreements"),
    transactions: db.collection<Transaction>("transactions"),
    inspectionBookings: db.collection<InspectionBooking>("inspectionBookings"),
    reviews: db.collection<ListingReview>("reviews"),
    tickets: db.collection<SupportTicket>("tickets"),
    savedSearches: db.collection<SavedSearch>("savedSearches"),
    notifications: withNotificationEmails(db.collection<Notification>("notifications")),
    reports: db.collection<Report>("reports"),
    referralCommissions: db.collection<ReferralCommission>("referralCommissions"),
    withdrawalRequests: db.collection<WithdrawalRequest>("withdrawalRequests"),
    meetings: db.collection<Meeting>("meetings"),
    meetingFeedback: db.collection<MeetingFeedback>("meetingFeedback"),
    analyticsEvents: db.collection<AnalyticsEvent>("analyticsEvents"),
    consentEvents: db.collection<ConsentEvent>("consentEvents"),
    propertyRequests: db.collection<PropertyRequest>("propertyRequests"),
    emailCampaigns: db.collection<EmailCampaign>("emailCampaigns"),
  };
}
