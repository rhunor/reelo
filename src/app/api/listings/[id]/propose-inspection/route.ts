import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z.object({ scheduledFor: z.string().min(1) });

// A rejected listing has no fee to re-pay anymore — the landlord just proposes a new
// inspection slot and goes straight back into the admin's pending-verification queue.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "landlord") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Propose a date for the inspection" }, { status: 400 });
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
    return NextResponse.json({ error: "This listing isn't awaiting a new inspection date" }, { status: 409 });
  }

  const now = new Date();
  await properties.updateOne(
    { _id: listing._id },
    {
      $set: {
        status: "pending_verification",
        "verification.scheduledFor": new Date(parsed.data.scheduledFor),
        updatedAt: now,
      },
      $unset: { "verification.rejectionReason": "" },
    },
  );

  return NextResponse.json({ success: true });
}
