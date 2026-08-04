import type { ObjectId } from "mongodb";

export type UserRole = "tenant" | "landlord" | "admin" | "support";

export type SubscriptionTier = "free" | "pro" | "pro_plus";

export type VerificationStatus = "unverified" | "pending" | "verified" | "failed";

export interface Subscription {
  tier: SubscriptionTier;
  status: "active" | "past_due" | "cancelled" | "none";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  inspectionBookingsUsed: number;
  providerSubscriptionId?: string;
}

export interface User {
  _id?: ObjectId;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  nin: {
    status: VerificationStatus;
    provider?: "youverify" | "prembly" | "smile_id";
    verifiedAt?: Date;
  };
  verifiedBadge: boolean;
  subscription: Subscription;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingType = "rent" | "sale";

// A listing only becomes publicly visible once an admin approves it, which can only
// happen after the landlord has paid for and RentDirect has carried out the in-person
// verification inspection (see ListingVerification below).
export type ListingStatus =
  | "draft"
  | "pending_verification"
  | "published"
  | "rejected"
  | "rented"
  | "sold"
  | "archived";

export interface ListingVerification {
  feeNGN: number;
  paymentReference?: string;
  paidAt?: Date;
  scheduledFor?: Date;
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface Property {
  _id?: ObjectId;
  landlordId: ObjectId;
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: string;
  priceNGN: number;
  depositNGN?: number;
  location: {
    state: string;
    city: string;
    area?: string;
    coordinates?: [number, number];
  };
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: "furnished" | "semi_furnished" | "unfurnished";
  amenities: string[];
  photoUrls: string[];
  status: ListingStatus;
  verification: ListingVerification;
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type InspectionStatus = "requested" | "confirmed" | "completed" | "cancelled";

export interface InspectionBooking {
  _id?: ObjectId;
  listingId: ObjectId;
  landlordId: ObjectId;
  tenantId: ObjectId;
  scheduledFor: Date;
  status: InspectionStatus;
  billingPeriodStart: Date;
  createdAt: Date;
}

export type AgreementStatus =
  | "draft"
  | "sent"
  | "signed_by_landlord"
  | "signed_by_tenant"
  | "fully_signed";

export interface Agreement {
  _id?: ObjectId;
  listingId: ObjectId;
  landlordId: ObjectId;
  tenantId: ObjectId;
  templateVersion: string;
  terms: {
    rentNGN: number;
    depositNGN: number;
    leaseStart: Date;
    leaseEndOrTermMonths: number | Date;
    responsibilities: string;
  };
  status: AgreementStatus;
  signatures: Array<{
    party: "landlord" | "tenant";
    signedAt: Date;
    signatureHash: string;
    ipAddress: string;
  }>;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType =
  | "rent"
  | "deposit"
  | "platform_commission"
  | "subscription"
  | "listing_verification";
export type TransactionStatus = "pending" | "success" | "failed" | "refunded";

export interface Transaction {
  _id?: ObjectId;
  type: TransactionType;
  amountNGN: number;
  commissionNGN?: number;
  payerId: ObjectId;
  payeeId?: ObjectId;
  listingId?: ObjectId;
  agreementId?: ObjectId;
  provider: "paystack" | "flutterwave";
  providerReference: string;
  status: TransactionStatus;
  createdAt: Date;
}

export interface ListingReview {
  _id?: ObjectId;
  listingId: ObjectId;
  // Reviews are tied to a fully-signed agreement — the closest thing this build has to
  // a "completed transaction" gate, since a full rent-payment lifecycle isn't built yet.
  agreementId: ObjectId;
  fromUserId: ObjectId;
  fromRole: "tenant" | "landlord";
  toUserId: ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export type TicketStatus = "open" | "in_progress" | "resolved";

// Landlords and tenants never contact each other directly — every inquiry, dispute, or
// coordination need (property questions, inspection scheduling, etc.) goes through a
// ticket addressed to RentDirect's support/admin side. `listingId` is set when a ticket
// was opened from a specific listing (e.g. a tenant asking about it); omitted for
// general support requests.
export interface SupportTicket {
  _id?: ObjectId;
  userId: ObjectId;
  userRole: "tenant" | "landlord";
  listingId?: ObjectId;
  subject: string;
  status: TicketStatus;
  assignedTo?: ObjectId;
  messages: Array<{
    senderId: ObjectId;
    senderRole: UserRole;
    body: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
