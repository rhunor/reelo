import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { translator, type MessageKey, type Translator } from "@/lib/i18n/dictionaries";
import { getInspectionFee } from "@/lib/fees";
import type { Property } from "@/types/models";

// Everything the dashboard's Meetings / Transaction history / Wallet windows show, shaped
// into plain serializable objects for the client component.

export type CalendarEventStatus = "pending" | "confirmed" | "declined" | "cancelled" | "completed";

export interface CalendarEvent {
  id: string;
  source: "meeting" | "inspection_booking" | "verification";
  kind: "inspection" | "meeting" | "verification";
  side: "landlord" | "tenant";
  listingTitle: string;
  at: string;
  status: CalendarEventStatus;
  // Whose move it is on a pending request — only the side that didn't propose can answer.
  myTurn: boolean;
  // Applicant's view of an agreed inspection that still needs its fee.
  payAmountNGN?: number;
  paid?: boolean;
  // Landlord still needs to confirm/decline Reallow's proposed verification time.
  verificationHref?: string;
  canLeaveFeedback: boolean;
  feedbackGiven: boolean;
}

export interface BookableApplication {
  ticketId: string;
  listingTitle: string;
  side: "landlord" | "tenant";
  applicantVerified: boolean;
  inspectionFeeNGN: number;
}

export interface LedgerEntry {
  id: string;
  label: string;
  detail?: string;
  amountNGN: number;
  direction: "in" | "out";
  status: string;
  at: string;
  href?: string;
}

export interface WalletEarning {
  id: string;
  amountNGN: number;
  status: "pending" | "approved" | "rejected";
  at: string;
}

export interface WalletWithdrawal {
  id: string;
  amountNGN: number;
  status: "pending" | "paid" | "rejected";
  at: string;
}

// `tr` translates the money-history labels into the viewer's language (English by default).
export async function loadDashboardData(userIdString: string, ownListings: Property[], tr: Translator = translator("en")) {
  const userId = new ObjectId(userIdString);
  const {
    meetings,
    inspectionBookings,
    properties,
    tickets,
    users,
    transactions,
    referralCommissions,
    withdrawalRequests,
    meetingFeedback,
  } = await getCollections();

  const [myMeetings, myBookings, myTransactions, commissions, withdrawals, feedback, myApplications] =
    await Promise.all([
      meetings.find({ $or: [{ landlordId: userId }, { tenantId: userId }] }).toArray(),
      inspectionBookings.find({ $or: [{ landlordId: userId }, { tenantId: userId }] }).toArray(),
      transactions
        .find({ $or: [{ payerId: userId }, { payeeId: userId }], status: "success" })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray(),
      referralCommissions.find({ referrerId: userId }).sort({ createdAt: -1 }).toArray(),
      withdrawalRequests.find({ userId }).sort({ createdAt: -1 }).toArray(),
      meetingFeedback.find({ userId }).project({ targetId: 1 }).toArray(),
      tickets.find({ userId, listingId: { $exists: true } }).toArray(),
    ]);

  // Applications to this user's own listings, for the landlord side of booking.
  const ownListingIds = ownListings.map((l) => l._id!);
  const applicationsToMe = ownListingIds.length
    ? await tickets.find({ listingId: { $in: ownListingIds }, userId: { $ne: userId } }).toArray()
    : [];

  const listingIds = [
    ...myMeetings.map((m) => m.listingId),
    ...myBookings.map((b) => b.listingId),
    ...myApplications.map((t) => t.listingId!),
  ];
  const otherListings = listingIds.length ? await properties.find({ _id: { $in: listingIds } }).toArray() : [];
  const listingById = new Map([...otherListings, ...ownListings].map((l) => [l._id!.toString(), l]));
  const titleOf = (id: ObjectId) => listingById.get(id.toString())?.title ?? "a property";

  const feedbackIds = new Set(feedback.map((f) => f.targetId.toString()));
  const now = Date.now();
  const isPast = (date?: Date) => Boolean(date && new Date(date).getTime() < now);

  const events: CalendarEvent[] = [];

  for (const m of myMeetings) {
    const side = m.tenantId.equals(userId) ? "tenant" : "landlord";
    const at = m.scheduledFor ?? m.proposedTime;
    const held = (m.status === "confirmed" || m.status === "completed") && isPast(at);
    events.push({
      id: m._id!.toString(),
      source: "meeting",
      kind: m.kind,
      side,
      listingTitle: titleOf(m.listingId),
      at: new Date(at).toISOString(),
      status: m.status,
      myTurn: m.status === "pending" && m.proposedBy !== side,
      payAmountNGN:
        side === "tenant" && m.kind === "inspection" && m.status === "confirmed" && !m.paidAt && !isPast(at)
          ? m.feeNGN
          : undefined,
      paid: Boolean(m.paidAt),
      canLeaveFeedback: held && !feedbackIds.has(m._id!.toString()),
      feedbackGiven: feedbackIds.has(m._id!.toString()),
    });
  }

  for (const b of myBookings) {
    const side = b.tenantId.equals(userId) ? "tenant" : "landlord";
    const at = b.scheduledFor ?? b.proposedTime ?? b.createdAt;
    const status: CalendarEventStatus =
      b.status === "completed" ? "completed" : b.status === "cancelled" ? "cancelled" : b.status === "confirmed" ? "confirmed" : "pending";
    const held = (status === "confirmed" || status === "completed") && isPast(at);
    events.push({
      id: b._id!.toString(),
      source: "inspection_booking",
      kind: "inspection",
      side,
      listingTitle: titleOf(b.listingId),
      at: new Date(at).toISOString(),
      status,
      // Older bookings are answered on the listing/applications pages, not here.
      myTurn: false,
      paid: true,
      canLeaveFeedback: held && !feedbackIds.has(b._id!.toString()),
      feedbackGiven: feedbackIds.has(b._id!.toString()),
    });
  }

  for (const listing of ownListings) {
    const v = listing.verification;
    if (!v.scheduledFor) continue;
    const verified = Boolean(v.checkedInAt) || listing.status === "published";
    const status: CalendarEventStatus = verified
      ? "completed"
      : v.landlordResponse === "declined"
        ? "declined"
        : v.landlordResponse === "confirmed" || v.landlordConfirmed
          ? "confirmed"
          : "pending";
    const held = (status === "confirmed" || status === "completed") && isPast(v.scheduledFor);
    events.push({
      id: listing._id!.toString(),
      source: "verification",
      kind: "verification",
      side: "landlord",
      listingTitle: listing.title,
      at: new Date(v.scheduledFor).toISOString(),
      status,
      myTurn: status === "pending" && listing.status === "pending_verification",
      verificationHref:
        status === "pending" && listing.status === "pending_verification"
          ? `/dashboard/landlord/listings/${listing._id}/verification`
          : undefined,
      canLeaveFeedback: held && !feedbackIds.has(listing._id!.toString()),
      feedbackGiven: feedbackIds.has(listing._id!.toString()),
    });
  }

  events.sort((a, b) => +new Date(a.at) - +new Date(b.at));

  const isApproved = (t: { landlordDecision?: string; landlordPreferred?: boolean }) =>
    (t.landlordDecision ?? (t.landlordPreferred ? "approved" : undefined)) === "approved";

  const applicantIds = applicationsToMe.filter(isApproved).map((t) => t.userId);
  const applicants = applicantIds.length
    ? await users.find({ _id: { $in: applicantIds } }, { projection: { verifiedBadge: 1 } }).toArray()
    : [];
  const applicantVerified = new Map(applicants.map((u) => [u._id!.toString(), Boolean(u.verifiedBadge)]));
  const me = await users.findOne({ _id: userId }, { projection: { verifiedBadge: 1 } });

  const bookable: BookableApplication[] = [
    ...myApplications.filter(isApproved).map((t) => ({
      ticketId: t._id!.toString(),
      listingTitle: titleOf(t.listingId!),
      side: "tenant" as const,
      applicantVerified: Boolean(me?.verifiedBadge),
      inspectionFeeNGN: getInspectionFee(listingById.get(t.listingId!.toString())?.location.city ?? ""),
    })),
    ...applicationsToMe.filter(isApproved).map((t) => ({
      ticketId: t._id!.toString(),
      listingTitle: titleOf(t.listingId!),
      side: "landlord" as const,
      applicantVerified: applicantVerified.get(t.userId.toString()) ?? false,
      inspectionFeeNGN: getInspectionFee(listingById.get(t.listingId!.toString())?.location.city ?? ""),
    })),
  ];

  // Money: payments made/received, referral earnings Reallow credited, and withdrawals.
  const ledger: LedgerEntry[] = [
    ...myTransactions.map((t) => {
      const isTopUp = t.type === "wallet_funding";
      const incoming = isTopUp || (t.payeeId?.equals(userId) && !t.payerId.equals(userId));
      return {
        id: t._id!.toString(),
        label: tr(`txType.${t.type}` as MessageKey),
        detail: [
          t.listingId ? titleOf(t.listingId) : undefined,
          t.provider === "wallet" ? tr("tx.paidFromWallet") : isTopUp ? tr("tx.cardTopUp") : undefined,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
        amountNGN: t.amountNGN,
        direction: (incoming ? "in" : "out") as "in" | "out",
        status: tr(incoming && !isTopUp ? "tx.heldUntilPayout" : "tx.successful"),
        at: new Date(t.createdAt).toISOString(),
        href: `/transactions/${t._id}`,
      };
    }),
    ...commissions
      .filter((c) => c.status === "approved")
      .map((c) => ({
        id: c._id!.toString(),
        label: tr("tx.referralCredited"),
        detail: tr("tx.referralDetail"),
        amountNGN: c.amountNGN,
        direction: "in" as const,
        status: tr("tx.creditedToWallet"),
        at: new Date(c.approvedAt ?? c.createdAt).toISOString(),
      })),
    ...withdrawals.map((w) => ({
      id: w._id!.toString(),
      label: tr("tx.withdrawal"),
      detail: tr("tx.toBank"),
      amountNGN: w.amountNGN,
      direction: "out" as const,
      status: tr(w.status === "paid" ? "tx.paid" : w.status === "rejected" ? "tx.rejected" : "tx.processing"),
      at: new Date(w.paidAt ?? w.createdAt).toISOString(),
    })),
  ];

  return {
    events,
    bookable,
    ledger,
    earnings: commissions.map(
      (c): WalletEarning => ({
        id: c._id!.toString(),
        amountNGN: c.amountNGN,
        status: c.status,
        at: new Date(c.approvedAt ?? c.createdAt).toISOString(),
      }),
    ),
    withdrawals: withdrawals.map(
      (w): WalletWithdrawal => ({
        id: w._id!.toString(),
        amountNGN: w.amountNGN,
        status: w.status,
        at: new Date(w.paidAt ?? w.createdAt).toISOString(),
      }),
    ),
  };
}
