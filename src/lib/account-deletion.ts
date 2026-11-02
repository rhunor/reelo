import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { refundMeetingFee } from "@/lib/meetings";

const OPEN_MEETING = ["awaiting_payment", "pending", "confirmed"] as const;

// Why an account can't be deleted yet — every one is money still in Reallow's hands for or
// from this person, which an admin has to settle first so nothing gets lost with the account.
export async function deletionBlockers(userId: ObjectId): Promise<string[]> {
  const { users, withdrawalRequests, agreements, meetings } = await getCollections();
  const [user, withdrawal, inFlight, paidMeeting] = await Promise.all([
    users.findOne({ _id: userId }, { projection: { walletBalanceNGN: 1 } }),
    withdrawalRequests.findOne({ userId, status: "pending" }, { projection: { _id: 1 } }),
    agreements.findOne(
      { $or: [{ landlordId: userId }, { tenantId: userId }], "payment.status": "paid_to_reallow" },
      { projection: { _id: 1 } },
    ),
    meetings.findOne({ tenantId: userId, status: { $in: [...OPEN_MEETING] }, paidAt: { $exists: true } }, { projection: { _id: 1 } }),
  ]);

  const blockers: string[] = [];
  const balance = user?.walletBalanceNGN ?? 0;
  if (balance > 0) blockers.push(`Their wallet still holds ₦${balance.toLocaleString()}.`);
  if (withdrawal) blockers.push("They have a withdrawal request waiting to be paid or rejected.");
  if (inFlight) blockers.push("A property payment they're part of hasn't been paid out to the owner yet.");
  if (paidMeeting) blockers.push("They've paid for a meeting that hasn't happened yet.");
  return blockers;
}

// Deleting an account wipes everything personal and makes it impossible to sign in, but
// keeps a bare "Deleted user" record under the same id — agreements, payments, reviews and
// reports still point at it, and those must stay intact for Reallow's records. The email
// and phone are freed, so the person could register again from scratch.
export async function deleteAccount(userId: ObjectId, adminId: ObjectId): Promise<void> {
  const { users, properties, agreements, meetings, tickets, referralCommissions, notifications, savedSearches } =
    await getCollections();
  const target = await users.findOne({ _id: userId });
  if (!target) return;
  const now = new Date();

  await users.replaceOne(
    { _id: userId },
    {
      role: target.role === "tenant" || target.role === "landlord" ? "user" : target.role,
      name: "Deleted user",
      firstName: "Deleted",
      lastName: "user",
      email: `deleted-${userId.toString()}@deleted.reallow.invalid`,
      nin: { status: "unverified" },
      verifiedBadge: false,
      status: "deleted",
      deletedAt: now,
      deletedBy: adminId,
      createdAt: target.createdAt,
      updatedAt: now,
    },
  );

  // Their listings come off the site for good.
  await properties.updateMany({ landlordId: userId, status: { $in: ["published", "pending_verification", "draft"] } }, [
    {
      $set: {
        takenDown: { at: now, by: adminId, reason: "owner_deleted", previousStatus: "$status" },
        status: "archived",
        updatedAt: now,
      },
    },
  ]);

  // Upcoming meetings on either side are called off; an applicant who paid to meet this
  // owner gets their fee back (a fee this person paid is a blocker, so never reaches here).
  const open = await meetings
    .find({ $or: [{ landlordId: userId }, { tenantId: userId }], status: { $in: [...OPEN_MEETING] } })
    .toArray();
  for (const meeting of open) {
    const cancelled = await meetings.updateOne(
      { _id: meeting._id, status: { $in: [...OPEN_MEETING] } },
      { $set: { status: "cancelled", cancelledBy: "reallow", updatedAt: now } },
    );
    if (cancelled.modifiedCount === 1) await refundMeetingFee({ ...meeting, status: "cancelled" });
  }

  await agreements.updateMany(
    { $or: [{ landlordId: userId }, { tenantId: userId }], "payment.status": "unpaid", status: { $nin: ["superseded", "cancelled"] } },
    { $set: { status: "cancelled", updatedAt: now } },
  );
  await tickets.updateMany(
    { userId, listingId: { $exists: true }, withdrawnAt: { $exists: false }, status: { $ne: "resolved" } },
    { $set: { withdrawnAt: now, status: "resolved", updatedAt: now } },
  );
  await referralCommissions.updateMany({ referrerId: userId, status: "pending" }, { $set: { status: "rejected" } });
  await Promise.all([
    notifications.deleteMany({ userId }),
    savedSearches.deleteMany({ userId }),
  ]);
}
