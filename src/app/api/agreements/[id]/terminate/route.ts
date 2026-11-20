import { NextResponse, after } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { isStaffRole } from "@/lib/roles";
import { notifyAdmins, titleOfListing } from "@/lib/notifications";

// Either party marks their own end of the tenancy as over, so Reallow's records (active
// tenancies on both dashboards) reflect it. Reallow doesn't hold the caution fee, so
// nothing financial follows from this — returning it is between landlord and tenant.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement" }, { status: 400 });
  }

  const { agreements } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(id) });
  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  // See the identical comment in sign/route.ts — party is this agreement's relationship,
  // not the account's global role.
  const party: "landlord" | "tenant" | null =
    agreement.landlordId.toString() === session.user.id
      ? "landlord"
      : agreement.tenantId.toString() === session.user.id
        ? "tenant"
        : null;
  if (!party) {
    return NextResponse.json({ error: "You are not a party to this agreement" }, { status: 403 });
  }
  if (agreement.status !== "fully_signed") {
    return NextResponse.json({ error: "This agreement isn't fully signed yet" }, { status: 409 });
  }

  const now = new Date();
  const update =
    party === "landlord"
      ? { terminatedByLandlord: true, terminatedByLandlordAt: now }
      : { terminatedByTenant: true, terminatedByTenantAt: now };

  const otherPartyTerminated =
    party === "landlord" ? agreement.terminatedByTenant : agreement.terminatedByLandlord;
  const bothTerminated = Boolean(otherPartyTerminated);

  await agreements.updateOne(
    { _id: agreement._id },
    {
      $set: { ...update, updatedAt: now },
    },
  );

  after(async () => {
    const title = await titleOfListing(agreement.listingId);
    await notifyAdmins(
      bothTerminated ? "Tenancy ended" : "Request to end a tenancy",
      bothTerminated
        ? `Both parties agreed to end the tenancy for ${title}.`
        : `The ${party === "landlord" ? "landlord" : "tenant"} asked to end the tenancy for ${title}.`,
      `/agreements/${agreement._id}`,
    );
  });
  return NextResponse.json({ success: true, bothTerminated });
}
