import type { ObjectId } from "mongodb";

export type UserRole = "tenant" | "landlord" | "admin" | "support";

export type VerificationStatus = "unverified" | "pending" | "verified" | "failed";

// Optional, tenant-controlled information a tenant can choose to surface to a landlord
// (via Reallow — never directly) to strengthen their case for a listing. Everything here
// is opt-in: `visibleToLandlords` is off by default, and nothing here should ever encode
// a protected characteristic — this is background/affordability context the tenant
// chooses to share, not a screening questionnaire Reallow imposes.
export interface TenantProfile {
  occupation?: string;
  employer?: string;
  monthlyIncomeNGN?: number;
  householdSize?: number;
  hasPets?: boolean;
  aboutMe?: string;
  visibleToLandlords: boolean;
}

// Who this user is, for KYC/payout purposes — deliberately separate from TenantProfile
// above, which is about what a tenant shares with a landlord for one specific listing
// candidacy. This is role-agnostic (landlords fill it in too) and feeds identity/payout
// matching, not landlord matching.
export interface UserProfile {
  occupation?: string;
  maritalStatus?: string;
  religion?: string;
  profilePictureUrl?: string;
  occupationVisible?: boolean;
  maritalStatusVisible?: boolean;
  religionVisible?: boolean;
  profilePictureVisible?: boolean;
}

export interface User {
  _id?: ObjectId;
  role: UserRole;
  name: string;
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  nin: {
    status: VerificationStatus;
    provider?: "youverify" | "prembly" | "smile_id";
    verifiedAt?: Date;
  };
  // Optional so existing users predating BVN verification don't break — treated as
  // "unverified" wherever read. See src/lib/kyc.ts recomputeVerifiedBadge: verifiedBadge
  // requires NIN and BVN both verified, not NIN alone.
  bvn?: {
    status: VerificationStatus;
    provider?: "youverify" | "prembly" | "smile_id";
    verifiedAt?: Date;
  };
  // Never exposed via any "public" visibility toggle — collected for KYC/payout name
  // matching only. Reallow won't pay out to a name that doesn't match across NIN/BVN/bank.
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  };
  verifiedBadge: boolean;
  termsAcceptedAt?: Date;
  termsVersion?: string;
  newsletterOptIn?: boolean;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiresAt?: Date;
  profile?: UserProfile;
  tenantProfile?: TenantProfile;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingType = "rent" | "sale";

// A listing only becomes publicly visible once an admin approves it, which can only
// happen after the landlord has paid for and Reallow has carried out the in-person
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
  // Set when the Reallow inspector actually arrives on site to carry out the in-person
  // verification visit — captured via the browser Geolocation API, compared against the
  // listing's own coordinates as a lightweight fraud check (see lib/geo.ts).
  checkedInAt?: Date;
  checkedInBy?: ObjectId;
  checkedInLocation?: { lat: number; lng: number };
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface Property {
  _id?: ObjectId;
  landlordId: ObjectId;
  title: string;
  description?: string;
  listingType: ListingType;
  propertyType: string;
  priceNGN: number;
  // Internally still "depositNGN" to avoid a data migration — every UI surface labels this
  // "Caution fee": refundable, held by Reallow, capped at CAUTION_FEE_CAP_RATE (see
  // src/lib/fees.ts) of annual rent regardless of what a landlord tries to enter.
  depositNGN?: number;
  // New, optional, uncapped — an additional estate/service charge on top of rent.
  estateChargeNGN?: number;
  // Per-listing minimum tenancy length in months. Falls back to the platform floor
  // (MINIMUM_LEASE_TERM_MONTHS in src/lib/listing-verification.ts) when unset.
  minimumTermMonths?: number;
  // Hard rules for this specific property (e.g. "no pets", "no smoking") — distinct from
  // tenantPreferences below, which is about who the landlord wants, not non-negotiable
  // rules. Shown on the listing publicly and handed to whoever drafts the real tenancy
  // agreement with a lawyer.
  dealBreakers?: string[];
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
  videoUrls: string[];
  // Free text the landlord writes describing who they're looking for (e.g. "working
  // professional, no pets, minimum 2-year stay"). Deliberately free-form rather than a
  // structured set of tenant attributes, so this can't become a checkbox list of
  // protected characteristics to filter on.
  tenantPreferences?: string;
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
  ticketId?: ObjectId;
  scheduledFor: Date;
  status: InspectionStatus;
  // Location-priced (src/lib/fees.ts) — covers Reallow's agent physically travelling to
  // the property. Only ever created by the Paystack webhook, on confirmed payment. Older
  // bookings created before this flow existed won't have these — treat as free/legacy.
  feeNGN?: number;
  transactionId?: ObjectId;
  createdAt: Date;
}

export type AgreementStatus =
  | "draft"
  | "sent"
  | "signed_by_landlord"
  | "signed_by_tenant"
  | "fully_signed";

// Rent + deposit only ever move Reallow -> nobody until Reallow pays the landlord out
// out-of-band (bank transfer, not Paystack) — see the guardrail comment in lib/paystack.ts.
// "paid_to_reallow" is the escrow state: money has landed in Reallow's account but not yet
// reached the landlord. Only Reallow staff can move a payment to "paid_out_to_landlord",
// and only manually, once the transfer has actually happened.
export type AgreementPaymentStatus = "unpaid" | "paid_to_reallow" | "paid_out_to_landlord";

export interface AgreementPayment {
  status: AgreementPaymentStatus;
  amountNGN?: number;
  reference?: string;
  paidAt?: Date;
  payoutAt?: Date;
  payoutBy?: ObjectId;
  // The caution fee is refund-eligible only once BOTH parties have confirmed the tenancy
  // ended (see Agreement.terminatedBy*) — same manual, admin-flips-a-flag pattern as the
  // landlord payout above, since "no damage" is a human judgment call, not automated.
  refundStatus?: "eligible" | "refunded";
  refundAmountNGN?: number;
  refundedAt?: Date;
  refundedBy?: ObjectId;
}

export interface Agreement {
  _id?: ObjectId;
  listingId: ObjectId;
  landlordId: ObjectId;
  tenantId: ObjectId;
  templateVersion: string;
  terms: {
    rentNGN: number;
    depositNGN: number;
    estateChargeNGN?: number;
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
  payment: AgreementPayment;
  // Either party can end the tenancy on their end at any time; the caution fee only
  // becomes refund-eligible once both have. Renewing/continuing past the lease term is
  // between the two of them — Reallow doesn't need to know unless one side terminates.
  terminatedByLandlord?: boolean;
  terminatedByLandlordAt?: Date;
  terminatedByTenant?: boolean;
  terminatedByTenantAt?: Date;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType =
  | "rent"
  | "deposit"
  | "estate_charge"
  | "platform_commission"
  | "legal_fee"
  | "listing_verification"
  | "inspection_fee"
  | "caution_fee_refund";
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
  // Reviews are gated on `Agreement.payment.status !== "unpaid"` (see api/reviews/route.ts) —
  // rent & deposit actually paid to Reallow, not just both signatures — since that's the real
  // "completed transaction" signal now that the payment lifecycle is built.
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
// ticket addressed to Reallow's support/admin side. `listingId` is set when a ticket
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
  // A landlord-scoped listing inquiry doubles as a "candidate" — see
  // /dashboard/landlord/candidates. landlordPreferred/-At are kept for backward
  // compatibility with tickets created before landlordDecision existed — every new read
  // site treats `landlordPreferred: true` as `landlordDecision: "approved"`.
  landlordPreferred?: boolean;
  landlordPreferredAt?: Date;
  // The real approve/decline decision on a tenant's interest in this listing. Approving
  // unlocks booking a paid physical inspection (see InspectionBooking); declining ends it
  // there — still no direct landlord<->tenant contact either way.
  landlordDecision?: "approved" | "declined";
  landlordDecisionAt?: Date;
  messages: Array<{
    senderId: ObjectId;
    senderRole: UserRole;
    body: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// A tenant's search criteria, persisted whenever it returns zero listings — this is both
// the record used to alert them later if a match appears, and the raw signal of unmet
// demand (which locations/types people search for that Reallow has no supply in).
export interface SavedSearch {
  _id?: ObjectId;
  userId: ObjectId;
  query: {
    state?: string;
    city?: string;
    listingType?: ListingType;
    propertyType?: string;
    maxPriceNGN?: number;
  };
  resultCountAtSearch: number;
  notifiedListingIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType =
  | "saved_search_match"
  | "ticket_new"
  | "ticket_reply"
  | "landlord_decision";

export interface Notification {
  _id?: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: ObjectId;
  ticketId?: ObjectId;
  read: boolean;
  createdAt: Date;
}
