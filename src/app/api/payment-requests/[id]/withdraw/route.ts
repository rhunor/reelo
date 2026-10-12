import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { canActAsLandlord } from "@/lib/reallow-landlord";

// The landlord takes back a payment request that hasn't been paid yet.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { agreements, notifications } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(id) });
  if (!agreement?.ticketId) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!(await canActAsLandlord(agreement.landlordId, session.user))) {
    return NextResponse.json({ error: "Not your property" }, { status: 403 });
  }
  const result = await agreements.updateOne(
    { _id: agreement._id, "payment.status": "unpaid", status: { $nin: ["superseded", "cancelled"] } },
    { $set: { status: "cancelled", updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) {
    return NextResponse.json({ error: "This request can't be withdrawn any more" }, { status: 409 });
  }
  await notifications.insertOne({
    userId: agreement.tenantId,
    type: "payment_superseded",
    title: "Payment request withdrawn",
    body: "The landlord withdrew their payment request. You can browse other properties on Reallow.",
    i18n: { title: "notif.payWithdrawn.title", body: "notif.payWithdrawn.body", vars: {} },
    listingId: agreement.listingId,
    href: "/listings",
    read: false,
    createdAt: new Date(),
  });
  return NextResponse.json({ success: true });
}
