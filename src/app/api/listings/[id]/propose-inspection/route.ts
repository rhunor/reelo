import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { isStaffRole } from "@/lib/roles";
import { notifyListingReceived } from "@/lib/notifications";

// Puts a rejected listing back into the verification queue. The landlord no longer picks a
// date — a Reallow agent calls to arrange the visit and schedules it (scheduleInspection),
// exactly like a brand-new listing.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(id) });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.landlordId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not your listing" }, { status: 403 });
  }
  if (listing.status !== "rejected" && listing.status !== "draft") {
    return NextResponse.json({ error: "This listing isn't awaiting resubmission" }, { status: 409 });
  }

  await properties.updateOne(
    { _id: listing._id },
    {
      $set: { status: "pending_verification", updatedAt: new Date() },
      $unset: {
        "verification.rejectionReason": "",
        "verification.scheduledFor": "",
        "verification.landlordConfirmed": "",
        "verification.landlordResponse": "",
        "verification.landlordRespondedAt": "",
        "verification.checkedInAt": "",
      },
    },
  );

  await notifyListingReceived(listing);

  return NextResponse.json({ success: true });
}
