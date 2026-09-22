"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifySavedSearchMatches, notifyVerificationInspectionScheduled } from "@/lib/notifications";
import { distanceMeters, CHECK_IN_DISTANCE_WARNING_METERS } from "@/lib/geo";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import { recomputeVerifiedBadge } from "@/lib/kyc";
import { generateReferralCode } from "@/lib/referrals";
import type { User } from "@/types/models";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// checkInAtListing is the one admin action a field agent also legitimately needs — it's
// literally their own action, not an admin decision.
async function requireAdminOrStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function scheduleInspection(formData: FormData) {
  await requireAdmin();
  const listingId = formData.get("listingId") as string;
  const scheduledFor = formData.get("scheduledFor") as string;

  const { properties, users } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");

  const landlord = await users.findOne({ _id: listing.landlordId });
  if (!landlord?.verifiedBadge) {
    throw new Error("This listing's landlord hasn't verified their identity yet");
  }

  const now = new Date();
  const scheduledDate = new Date(scheduledFor);

  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        "verification.scheduledFor": scheduledDate,
        // Re-confirmation is required any time the date changes, including the first time
        // it's set — a phone call alone shouldn't be the only record of the agreed time.
        "verification.landlordConfirmed": false,
        updatedAt: now,
      },
    },
  );

  await notifyVerificationInspectionScheduled(listing, scheduledDate);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/landlord");
}

export async function approveListing(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = formData.get("listingId") as string;

  const { properties, users } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");

  const landlord = await users.findOne({ _id: listing.landlordId });
  if (!landlord?.verifiedBadge) {
    throw new Error("This listing's landlord hasn't verified their identity yet");
  }

  const now = new Date();

  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        status: "published",
        "verification.reviewedBy": new ObjectId(admin.id),
        "verification.reviewedAt": now,
        updatedAt: now,
      },
    },
  );

  await notifySavedSearchMatches(listing);

  revalidatePath("/dashboard/admin");
}

export async function checkInAtListing(formData: FormData) {
  const staff = await requireAdminOrStaff();
  const listingId = formData.get("listingId") as string;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");

  const now = new Date();
  let flagged = false;

  if (listing.location.coordinates) {
    const distance = distanceMeters(
      { lat, lng },
      { lat: listing.location.coordinates[1], lng: listing.location.coordinates[0] },
    );
    flagged = distance > CHECK_IN_DISTANCE_WARNING_METERS;
  }

  await properties.updateOne(
    { _id: listing._id },
    {
      $set: {
        "verification.checkedInAt": now,
        "verification.checkedInBy": new ObjectId(staff.id),
        "verification.checkedInLocation": { lat, lng },
        updatedAt: now,
      },
    },
  );

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
  return { flagged };
}

// Reallow holds rent/deposit money the moment Paystack confirms it (see the webhook) —
// this only records that staff have since sent it on to the landlord by bank transfer.
// It never moves money itself; that transfer happens outside this app, by design (see
// the guardrail comment in lib/paystack.ts on why Paystack split payments aren't used).
export async function markAgreementPaidOut(formData: FormData) {
  const staff = await requireAdmin();
  const agreementId = formData.get("agreementId") as string;

  const { agreements } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(agreementId) });
  if (!agreement) throw new Error("Agreement not found");
  if (agreement.payment.status !== "paid_to_reallow") {
    throw new Error("This agreement isn't awaiting payout");
  }

  const now = new Date();
  await agreements.updateOne(
    { _id: agreement._id },
    {
      $set: {
        "payment.status": "paid_out_to_landlord",
        "payment.payoutAt": now,
        "payment.payoutBy": new ObjectId(staff.id),
        updatedAt: now,
      },
    },
  );

  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath("/dashboard/admin/agreements");
}

// Same manual pattern as markAgreementPaidOut above: admin flips the flag once the actual
// bank transfer to the tenant has happened out-of-band — this never moves money itself.
// payerId reuses Reallow's own system account (getOrCreateReallowLandlordId) since the
// refund comes from Reallow's held funds, not the landlord — a reuse of that helper
// outside its original "admin-posted listing" purpose, but it's the one real User doc
// that already stands in for "Reallow" as an account.
export async function refundCautionFee(formData: FormData) {
  const staff = await requireAdmin();
  const agreementId = formData.get("agreementId") as string;

  const { agreements, transactions } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(agreementId) });
  if (!agreement) throw new Error("Agreement not found");
  if (agreement.payment.refundStatus !== "eligible") {
    throw new Error("This agreement's caution fee isn't refund-eligible");
  }

  const now = new Date();
  const reallowId = await getOrCreateReallowLandlordId();
  const refundAmountNGN = agreement.terms.depositNGN;

  await transactions.insertOne({
    type: "caution_fee_refund",
    amountNGN: refundAmountNGN,
    payerId: reallowId,
    payeeId: agreement.tenantId,
    listingId: agreement.listingId,
    agreementId: agreement._id!,
    provider: "paystack",
    providerReference: `refund_${agreement._id}_${now.getTime()}`,
    status: "success",
    createdAt: now,
  });

  await agreements.updateOne(
    { _id: agreement._id },
    {
      $set: {
        "payment.refundStatus": "refunded",
        "payment.refundAmountNGN": refundAmountNGN,
        "payment.refundedAt": now,
        "payment.refundedBy": new ObjectId(staff.id),
        updatedAt: now,
      },
    },
  );

  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath("/dashboard/admin/agreements");
}

export async function rejectListing(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = formData.get("listingId") as string;
  const reason = (formData.get("reason") as string) || "Did not pass verification inspection";

  const { properties } = await getCollections();
  const now = new Date();

  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        status: "rejected",
        "verification.reviewedBy": new ObjectId(admin.id),
        "verification.reviewedAt": now,
        "verification.rejectionReason": reason,
        updatedAt: now,
      },
    },
  );

  revalidatePath("/dashboard/admin");
}

// Ban/unban and archive-listing enforcement — the practical teeth behind the "Reallow may
// suspend any account or remove any listing for misconduct" Terms clause, and what the new
// report review queue (src/app/dashboard/admin/reports/page.tsx) actually acts on.
export async function banUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;

  const { users } = await getCollections();
  await users.updateOne({ _id: new ObjectId(userId) }, { $set: { status: "banned", updatedAt: new Date() } });

  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin/users");
}

export async function unbanUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;

  const { users } = await getCollections();
  await users.updateOne({ _id: new ObjectId(userId) }, { $set: { status: "active", updatedAt: new Date() } });

  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin/users");
}

export async function archiveListing(formData: FormData) {
  await requireAdmin();
  const listingId = formData.get("listingId") as string;

  const { properties } = await getCollections();
  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    { $set: { status: "archived", updatedAt: new Date() } },
  );

  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/listings");
}

export async function updateReportStatus(formData: FormData) {
  const admin = await requireAdmin();
  const reportId = formData.get("reportId") as string;
  const status = formData.get("status") as "reviewing" | "resolved" | "dismissed";
  const isFinal = status === "resolved" || status === "dismissed";

  const { reports } = await getCollections();
  await reports.updateOne(
    { _id: new ObjectId(reportId) },
    {
      $set: {
        status,
        ...(isFinal ? { resolvedAt: new Date(), resolvedBy: new ObjectId(admin.id) } : {}),
      },
    },
  );

  revalidatePath("/dashboard/admin/reports");
}

// The landlord's own confirmation that the date/time Reallow set after calling them is
// correct — a deliberate extra in-app step, not just relying on the phone call alone.
export async function confirmVerificationInspection(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");
  if (listing.landlordId.toString() !== session.user.id) throw new Error("Unauthorized");

  await properties.updateOne(
    { _id: listing._id },
    { $set: { "verification.landlordConfirmed": true, updatedAt: new Date() } },
  );

  revalidatePath("/dashboard/landlord");
}

// Testing-only bypass for the real Youverify NIN/BVN calls — lets staff verify an account
// manually so the verified-user flows (applying for a listing, booking inspections) can be
// exercised without a live third-party check. Mirrors the exact status shape the real
// verify-nin/verify-bvn routes set.
export async function adminVerifyUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;

  const { users } = await getCollections();
  const now = new Date();

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        "nin.status": "verified",
        "nin.verifiedAt": now,
        "bvn.status": "verified",
        "bvn.verifiedAt": now,
        updatedAt: now,
      },
    },
  );

  await recomputeVerifiedBadge(new ObjectId(userId));

  revalidatePath("/dashboard/admin/users");
}

// Approving is the actual credit event — nothing lands in a referrer's wallet until an
// admin has looked at it. Deliberate fraud gate, not a formality.
export async function approveReferralCommission(formData: FormData) {
  const admin = await requireAdmin();
  const commissionId = formData.get("commissionId") as string;

  const { referralCommissions, users } = await getCollections();
  const commission = await referralCommissions.findOne({ _id: new ObjectId(commissionId) });
  if (!commission) throw new Error("Commission not found");
  if (commission.status !== "pending") throw new Error("This commission has already been decided");

  const now = new Date();
  await users.updateOne(
    { _id: commission.referrerId },
    { $inc: { walletBalanceNGN: commission.amountNGN }, $set: { updatedAt: now } },
  );
  await referralCommissions.updateOne(
    { _id: commission._id },
    { $set: { status: "approved", approvedAt: now, approvedBy: new ObjectId(admin.id) } },
  );

  revalidatePath("/dashboard/admin/referrals");
}

export async function rejectReferralCommission(formData: FormData) {
  const admin = await requireAdmin();
  const commissionId = formData.get("commissionId") as string;

  const { referralCommissions } = await getCollections();
  await referralCommissions.updateOne(
    { _id: new ObjectId(commissionId) },
    { $set: { status: "rejected", approvedAt: new Date(), approvedBy: new ObjectId(admin.id) } },
  );

  revalidatePath("/dashboard/admin/referrals");
}

// Same manual, admin-marks-it-paid pattern as markAgreementPaidOut/refundCautionFee — the
// actual bank transfer happens out-of-band; this only records that it did.
export async function markWithdrawalPaid(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = formData.get("requestId") as string;

  const { withdrawalRequests, users } = await getCollections();
  const request = await withdrawalRequests.findOne({ _id: new ObjectId(requestId) });
  if (!request) throw new Error("Withdrawal request not found");
  if (request.status !== "pending") throw new Error("This request has already been decided");

  const now = new Date();
  await users.updateOne(
    { _id: request.userId },
    { $inc: { walletBalanceNGN: -request.amountNGN }, $set: { updatedAt: now } },
  );
  await withdrawalRequests.updateOne(
    { _id: request._id },
    { $set: { status: "paid", paidAt: now, paidBy: new ObjectId(admin.id) } },
  );

  revalidatePath("/dashboard/admin/referrals");
}

export async function rejectWithdrawal(formData: FormData) {
  await requireAdmin();
  const requestId = formData.get("requestId") as string;

  const { withdrawalRequests } = await getCollections();
  await withdrawalRequests.updateOne(
    { _id: new ObjectId(requestId) },
    { $set: { status: "rejected" } },
  );

  revalidatePath("/dashboard/admin/referrals");
}

// The in-app equivalent of `npm run create-staff-account` — there's still no self-service
// signup path for a "staff" (field agent) account, by design, but admin no longer needs
// CLI/database access to create one.
export async function createStaffAccount(formData: FormData) {
  await requireAdmin();
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!email || !password || password.length < 8) {
    throw new Error("Email and an 8+ character password are required");
  }

  const { users } = await getCollections();
  const existing = await users.findOne({ email });
  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const referralCode = await generateReferralCode(name?.split(" ")[0] || "STAFF");

  await users.insertOne({
    role: "staff",
    name: name || "Reallow Staff",
    email,
    passwordHash,
    nin: { status: "verified" },
    verifiedBadge: true,
    referralCode,
    walletBalanceNGN: 0,
    createdAt: now,
    updatedAt: now,
  } as User);

  revalidatePath("/dashboard/admin/users");
}
