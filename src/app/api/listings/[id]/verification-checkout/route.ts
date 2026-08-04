import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email || session.user.role !== "landlord") {
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
  if (listing.status !== "draft" && listing.status !== "rejected") {
    return NextResponse.json({ error: "This listing already has a verification payment" }, { status: 409 });
  }

  const reference = `listingver_${listing._id}_${Date.now()}`;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.user.email,
      amountKobo: listing.verification.feeNGN * 100,
      reference,
      metadata: {
        kind: "listing_verification",
        listingId: listing._id!.toString(),
        landlordId: session.user.id,
      },
    });

    return NextResponse.json({ authorizationUrl, reference });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
