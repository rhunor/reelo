import { getMongoClientPromise } from "@/lib/mongodb";
import type {
  Agreement,
  InspectionBooking,
  ListingReview,
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

export async function getCollections() {
  const db = await getDb();
  return {
    users: db.collection<User>("users"),
    properties: db.collection<Property>("properties"),
    agreements: db.collection<Agreement>("agreements"),
    transactions: db.collection<Transaction>("transactions"),
    inspectionBookings: db.collection<InspectionBooking>("inspectionBookings"),
    reviews: db.collection<ListingReview>("reviews"),
    tickets: db.collection<SupportTicket>("tickets"),
    savedSearches: db.collection<SavedSearch>("savedSearches"),
    notifications: db.collection<Notification>("notifications"),
    reports: db.collection<Report>("reports"),
    referralCommissions: db.collection<ReferralCommission>("referralCommissions"),
    withdrawalRequests: db.collection<WithdrawalRequest>("withdrawalRequests"),
  };
}
