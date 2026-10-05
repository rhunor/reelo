"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import {
  notifySavedSearchMatches,
  notifyVerificationInspectionScheduled,
  notifyVerificationVisitDeclined,
  notifyListingStatusChanged,
  notifyRoleChanged,
} from "@/lib/notifications";
import { isCustomerRole } from "@/lib/roles";
import { SUPPORTED_STATES } from "@/lib/locations";

function isStaffBase(value: unknown): value is NonNullable<User["staffBase"]> {
  return SUPPORTED_STATES.some((s) => s.value === value);
}
import { distanceMeters, CHECK_IN_DISTANCE_WARNING_METERS } from "@/lib/geo";
import { recomputeVerifiedBadge } from "@/lib/kyc";
import { generateReferralCode } from "@/lib/referrals";
import { parseLagosDateTimeLocal } from "@/lib/time";
import type { ListingStatus, User } from "@/types/models";

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

// Field agents set this too, from their own dashboard, after calling the landlord to agree a
// time — it's their arrangement to record, not an admin-only decision.
export async function scheduleInspection(formData: FormData) {
  await requireAdminOrStaff();
  const listingId = formData.get("listingId") as string;
  const scheduledFor = formData.get("scheduledFor") as string;
  if (!scheduledFor || Number.isNaN(parseLagosDateTimeLocal(scheduledFor).getTime())) {
    throw new Error("Pick a valid date and time");
  }

  const { properties, users } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");

  const landlord = await users.findOne({ _id: listing.landlordId });
  if (!landlord?.verifiedBadge) {
    throw new Error("This listing's landlord hasn't verified their identity yet");
  }

  const now = new Date();
  const scheduledDate = parseLagosDateTimeLocal(scheduledFor);

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
      $unset: { "verification.landlordResponse": "", "verification.landlordRespondedAt": "" },
    },
  );

  await notifyVerificationInspectionScheduled(listing, scheduledDate);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
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
  const admin = await requireAdmin();
  const userId = new ObjectId(formData.get("userId") as string);
  const reason = ((formData.get("reason") as string) || "").trim().slice(0, 300) || undefined;
  if (userId.equals(new ObjectId(admin.id))) throw new Error("You can't block your own account");

  const { users, properties } = await getCollections();
  const target = await users.findOne({ _id: userId });
  if (!target || target.role === "admin") throw new Error("This account can't be blocked here");

  const now = new Date();
  await users.updateOne(
    { _id: userId },
    { $set: { status: "banned", bannedAt: now, bannedBy: new ObjectId(admin.id), bannedReason: reason, updatedAt: now } },
  );
  // A blocked owner's live listings come down with them (and go back up on unblock).
  await properties.updateMany({ landlordId: userId, status: "published" }, [
    {
      $set: {
        takenDown: { at: now, by: new ObjectId(admin.id), reason: "owner_blocked", previousStatus: "$status" },
        status: "archived",
        updatedAt: now,
      },
    },
  ]);

  revalidateModeration();
}

export async function unbanUser(formData: FormData) {
  await requireAdmin();
  const userId = new ObjectId(formData.get("userId") as string);

  const { users, properties } = await getCollections();
  const now = new Date();
  await users.updateOne(
    { _id: userId },
    { $set: { status: "active", updatedAt: now }, $unset: { bannedAt: "", bannedBy: "", bannedReason: "" } },
  );
  await properties.updateMany({ landlordId: userId, "takenDown.reason": "owner_blocked" }, [
    { $set: { status: "$takenDown.previousStatus", updatedAt: now } },
    { $unset: "takenDown" },
  ]);

  revalidateModeration();
}

function revalidateModeration() {
  revalidatePath("/dashboard/admin/users/[id]", "page");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/listings");
  revalidatePath("/listings");
}

const LISTING_ACTIONS = ["hide", "show", "rented", "sold"] as const;
type ListingAction = (typeof LISTING_ACTIONS)[number];

// Reallow's controls over any listing: take it off the site (optionally with a note to
// the owner), put it back, or mark it rented/sold. Rented and sold listings drop out of
// search but their page stays up saying so.
export async function setListingVisibility(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = new ObjectId(formData.get("listingId") as string);
  const action = formData.get("action") as ListingAction;
  const note = ((formData.get("note") as string) || "").trim().slice(0, 500) || undefined;
  if (!LISTING_ACTIONS.includes(action)) throw new Error("Invalid action");

  const { properties, users } = await getCollections();
  const listing = await properties.findOne({ _id: listingId });
  if (!listing) throw new Error("Listing not found");
  const now = new Date();

  if (action === "hide") {
    if (listing.status === "archived") return;
    await properties.updateOne(
      { _id: listingId },
      {
        $set: {
          status: "archived",
          takenDown: { at: now, by: new ObjectId(admin.id), reason: "admin", note, previousStatus: listing.status },
          updatedAt: now,
        },
      },
    );
  } else if (action === "show") {
    const owner = await users.findOne({ _id: listing.landlordId }, { projection: { status: 1 } });
    if (owner?.status === "banned") throw new Error("Unblock the owner first");
    // A taken-down listing goes back to whatever it was; a rented/sold one goes back to live.
    const previous = listing.takenDown?.previousStatus;
    const restoreTo: ListingStatus =
      listing.status === "archived" && previous && previous !== "archived" ? previous : "published";
    // Never let this skip in-person verification.
    const everLive =
      Boolean(listing.verification.reviewedAt) || ["published", "rented", "sold"].includes(previous ?? listing.status);
    if (restoreTo === "published" && !everLive) throw new Error("This listing hasn't been verified yet");
    await properties.updateOne(
      { _id: listingId },
      { $set: { status: restoreTo, updatedAt: now }, $unset: { takenDown: "" } },
    );
  } else {
    await properties.updateOne(
      { _id: listingId },
      { $set: { status: action, updatedAt: now }, $unset: { takenDown: "" } },
    );
  }

  await notifyListingStatusChanged(listing, action, note);
  revalidateModeration();
  revalidatePath(`/listings/${listingId}`);
}

// Kept for the reports queue's "Remove listing" button.
export async function archiveListing(formData: FormData) {
  formData.set("action", "hide");
  await setListingVisibility(formData);
}

export async function updateReportStatus(formData: FormData) {
  const admin = await requireAdmin();
  const reportId = formData.get("reportId") as string;
  const status = formData.get("status") as "reviewing" | "resolved" | "dismissed";
  if (!["reviewing", "resolved", "dismissed"].includes(status)) throw new Error("Invalid status");
  const note = ((formData.get("adminNote") as string) || "").trim().slice(0, 1000);
  const isFinal = status === "resolved" || status === "dismissed";

  const { reports } = await getCollections();
  await reports.updateOne(
    { _id: new ObjectId(reportId) },
    {
      $set: {
        status,
        ...(note ? { adminNote: note } : {}),
        ...(isFinal ? { resolvedAt: new Date(), resolvedBy: new ObjectId(admin.id) } : {}),
      },
    },
  );

  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/admin");
}

// The landlord's own confirmation that the date/time Reallow set after calling them is
// correct — a deliberate extra in-app step, not just relying on the phone call alone.
async function requireOwnScheduledListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const listingId = formData.get("listingId") as string;
  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");
  if (listing.landlordId.toString() !== session.user.id) throw new Error("Unauthorized");
  if (!listing.verification.scheduledFor) throw new Error("No visit has been scheduled yet");
  return listing;
}

export async function confirmVerificationInspection(formData: FormData) {
  const listing = await requireOwnScheduledListing(formData);
  const { properties } = await getCollections();
  const now = new Date();

  await properties.updateOne(
    { _id: listing._id },
    {
      $set: {
        "verification.landlordConfirmed": true,
        "verification.landlordResponse": "confirmed",
        "verification.landlordRespondedAt": now,
        updatedAt: now,
      },
    },
  );

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/landlord/listings/${listing._id}/verification`);
  revalidatePath("/dashboard/staff");
}

// "This time doesn't work" — the scheduled time stays on record so staff can see what was
// declined, and every admin/agent is notified to call the landlord and set a new one.
export async function declineVerificationInspection(formData: FormData) {
  const listing = await requireOwnScheduledListing(formData);
  const { properties } = await getCollections();
  const now = new Date();

  await properties.updateOne(
    { _id: listing._id },
    {
      $set: {
        "verification.landlordConfirmed": false,
        "verification.landlordResponse": "declined",
        "verification.landlordRespondedAt": now,
        updatedAt: now,
      },
    },
  );
  await notifyVerificationVisitDeclined(listing);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/landlord/listings/${listing._id}/verification`);
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/admin");
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

// Same manual, admin-marks-it-paid pattern as markAgreementPaidOut — the
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
export type StaffAccountFormState = { status: "idle" | "success" | "error"; message?: string };

// Used with useActionState (see components/create-staff-account-form.tsx): problems come
// back as a message on the form rather than a thrown error, which would replace the whole
// page with the error screen — and a double-submitted form (the bcrypt hash makes this
// take about a second) would otherwise always "fail" on its second request.
export async function createStaffAccount(
  _previous: StaffAccountFormState,
  formData: FormData,
): Promise<StaffAccountFormState> {
  await requireAdmin();
  const email = ((formData.get("email") as string) ?? "").toLowerCase().trim();
  const password = (formData.get("password") as string) ?? "";
  const name = ((formData.get("name") as string) ?? "").trim();
  const staffBase = formData.get("staffBase") as string;

  if (!isStaffBase(staffBase)) {
    return { status: "error", message: "Choose the city this staff member works from." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { status: "error", message: "The password needs at least 8 characters." };
  }

  const { users } = await getCollections();
  if (await users.findOne({ email }, { projection: { _id: 1 } })) {
    return { status: "error", message: `An account with ${email} already exists.` };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const referralCode = await generateReferralCode(name.split(" ")[0] || "STAFF");

  // Atomic "insert only if this email is still free", so two simultaneous submissions can
  // never create two accounts (there's no unique index on email to lean on).
  const result = await users.updateOne(
    { email },
    {
      $setOnInsert: {
        role: "staff",
        name: name || "Reallow Staff",
        email,
        passwordHash,
        nin: { status: "verified" },
        verifiedBadge: true,
        referralCode,
        walletBalanceNGN: 0,
        staffBase,
        createdAt: now,
        updatedAt: now,
      } as User,
    },
    { upsert: true },
  );
  if (result.upsertedCount === 0) {
    return { status: "error", message: `An account with ${email} already exists.` };
  }

  revalidatePath("/dashboard/admin/users");
  return { status: "success", message: `Staff account created for ${email}. They can log in now.` };
}

export type RoleFormState = { status: "idle" | "success" | "error"; message?: string };
const ASSIGNABLE_ROLES = ["customer", "staff", "support", "admin"] as const;

// Promote anyone to staff/support/admin, or move them back to an ordinary customer account.
// Their session picks the new role up within a minute (see the account re-check in
// src/auth.ts), so they land on the matching dashboard without logging out.
export async function changeUserRole(_previous: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const admin = await requireAdmin();
  const userIdRaw = formData.get("userId") as string;
  const target = formData.get("role") as (typeof ASSIGNABLE_ROLES)[number];
  if (!ObjectId.isValid(userIdRaw) || !ASSIGNABLE_ROLES.includes(target)) {
    return { status: "error", message: "Choose a valid role." };
  }
  const userId = new ObjectId(userIdRaw);
  if (userId.equals(new ObjectId(admin.id))) {
    return { status: "error", message: "You can't change your own role." };
  }

  const { users } = await getCollections();
  const user = await users.findOne({ _id: userId });
  if (!user) return { status: "error", message: "User not found." };

  const nextRole: User["role"] = target === "customer" ? "user" : target;
  const staffBase = formData.get("staffBase") as string;
  const needsBase = nextRole === "staff" || nextRole === "support";
  if (needsBase && !isStaffBase(staffBase)) {
    return { status: "error", message: "Choose the city they work from." };
  }
  const roleUnchanged = nextRole === user.role || (target === "customer" && isCustomerRole(user.role));
  const baseUnchanged = !needsBase || staffBase === user.staffBase;
  if (roleUnchanged && baseUnchanged) return { status: "idle" };

  if (user.role === "admin" && (await users.countDocuments({ role: "admin" })) <= 1) {
    return { status: "error", message: "There must always be at least one admin." };
  }

  const now = new Date();
  if (roleUnchanged) {
    await users.updateOne({ _id: userId }, { $set: { staffBase: staffBase as User["staffBase"], updatedAt: now } });
    revalidatePath("/dashboard/admin/users");
    return { status: "success", message: `${user.name} is now based in ${staffBase}.` };
  }
  await users.updateOne(
    { _id: userId },
    needsBase
      ? { $set: { role: nextRole, staffBase: staffBase as User["staffBase"], updatedAt: now } }
      : { $set: { role: nextRole, updatedAt: now }, $unset: { staffBase: "" } },
  );
  await notifyRoleChanged(userId, isCustomerRole(nextRole) ? "customer" : nextRole);

  revalidatePath("/dashboard/admin/users");
  return {
    status: "success",
    message: `${user.name} is now ${ROLE_LABEL[nextRole]}${needsBase ? ` (${staffBase})` : ""}.`,
  };
}

const ROLE_LABEL: Record<User["role"], string> = {
  user: "a regular user",
  tenant: "a regular user",
  landlord: "a regular user",
  staff: "field staff",
  support: "support",
  admin: "an admin",
};

// Internal remarks on an account — appended, never edited, so there's a trail.
export async function addUserNote(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  const body = ((formData.get("body") as string) ?? "").trim().slice(0, 2000);
  if (!body || !ObjectId.isValid(userId)) return;

  const { users } = await getCollections();
  const me = await users.findOne({ _id: new ObjectId(admin.id) }, { projection: { name: 1 } });
  await users.updateOne(
    { _id: new ObjectId(userId) },
    { $push: { adminNotes: { body, by: new ObjectId(admin.id), byName: me?.name, at: new Date() } } },
  );
  revalidatePath(`/dashboard/admin/users/${userId}`);
}
