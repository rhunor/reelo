import { getMongoClientPromise } from "@/lib/mongodb";
import type {
  Agreement,
  InspectionBooking,
  ListingReview,
  Property,
  SupportTicket,
  Transaction,
  User,
} from "@/types/models";

const dbName = process.env.MONGODB_DB || "rentdirect";

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
  };
}
