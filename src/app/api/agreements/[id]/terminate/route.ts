import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

// Either party marks their own end of the tenancy as over — once BOTH have, the caution
// fee becomes eligible for refund (an admin still has to actually action the refund, see
// markAgreementPaidOut's sibling in dashboard/admin/actions.ts). Renewing/continuing the
// tenancy past the lease term is between landlord and tenant; Reallow only needs to know
// when one side considers it actually finished.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || (session.user.role !== "landlord" && session.user.role !== "tenant")) {
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

  const party = session.user.role as "landlord" | "tenant";
  const expectedPartyId = party === "landlord" ? agreement.landlordId : agreement.tenantId;
  if (expectedPartyId.toString() !== session.user.id) {
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
      $set: {
        ...update,
        ...(bothTerminated && agreement.payment.status !== "unpaid"
          ? { "payment.refundStatus": "eligible" }
          : {}),
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ success: true, bothTerminated });
}
