import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { refundMeetingFee } from "@/lib/meetings";
import { notifyAdmins, notifyListingUnlisted } from "@/lib/notifications";

const schema = z.object({ action: z.enum(["unlist", "relist"]) });

// The owner takes their property off the market (or puts it back). Unlisting hides it
// straight away, withdraws unpaid payment requests, cancels upcoming meetings (refunding any
// paid fee) and tells people with an active application. Relisting returns it to where it
// was — live, or still awaiting verification.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { properties, tickets, meetings, agreements } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(id), landlordId: new ObjectId(session.user.id) });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  const now = new Date();

  if (parsed.data.action === "relist") {
    if (listing.status !== "archived" || listing.takenDown?.reason !== "owner_unlisted") {
      return NextResponse.json({ error: "This listing can't be relisted from here — contact Reallow" }, { status: 409 });
    }
    const back = listing.takenDown.previousStatus === "published" ? "published" : "pending_verification";
    await properties.updateOne({ _id: listing._id }, { $set: { status: back, updatedAt: now }, $unset: { takenDown: "" } });
    await notifyAdmins("Listing relisted by owner", `${listing.title} is back ${back === "published" ? "on the market" : "awaiting verification"}.`, "/dashboard/admin/listings");
    return NextResponse.json({ success: true, status: back });
  }

  if (listing.status !== "published" && listing.status !== "pending_verification") {
    return NextResponse.json({ error: "Only a live or pending listing can be unlisted" }, { status: 409 });
  }
  const result = await properties.updateOne(
    { _id: listing._id, status: listing.status },
    {
      $set: {
        status: "archived",
        takenDown: { at: now, by: listing.landlordId, reason: "owner_unlisted", previousStatus: listing.status },
        updatedAt: now,
      },
    },
  );
  if (result.modifiedCount !== 1) return NextResponse.json({ error: "Please try again" }, { status: 409 });

  await agreements.updateMany(
    { listingId: listing._id, "payment.status": "unpaid", status: { $nin: ["superseded", "cancelled"] } },
    { $set: { status: "cancelled", updatedAt: now } },
  );
  const open = await meetings.find({ listingId: listing._id, status: { $in: ["awaiting_payment", "pending", "confirmed"] } }).toArray();
  for (const meeting of open) {
    const cancelled = await meetings.updateOne(
      { _id: meeting._id, status: { $in: ["awaiting_payment", "pending", "confirmed"] } },
      { $set: { status: "cancelled", cancelledBy: "landlord", updatedAt: now } },
    );
    if (cancelled.modifiedCount === 1) await refundMeetingFee({ ...meeting, status: "cancelled" });
  }
  const applicants = await tickets.distinct("userId", {
    listingId: listing._id,
    withdrawnAt: { $exists: false },
    landlordDecision: { $ne: "declined" },
  });
  await notifyListingUnlisted(listing, applicants as ObjectId[]);
  return NextResponse.json({ success: true });
}
