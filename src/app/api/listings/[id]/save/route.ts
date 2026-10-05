import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

// Toggles "save for later". The listing's savesCount moves only when the saved list
// actually changed, so double-taps can't inflate it.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in to save properties" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const { users, properties } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const listingId = new ObjectId(id);
  if (!(await properties.findOne({ _id: listingId }, { projection: { _id: 1 } }))) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const added = await users.updateOne(
    { _id: userId, savedListingIds: { $ne: listingId } },
    { $addToSet: { savedListingIds: listingId } },
  );
  if (added.modifiedCount === 1) {
    await properties.updateOne({ _id: listingId }, { $inc: { savesCount: 1 } });
    return NextResponse.json({ saved: true });
  }

  const removed = await users.updateOne({ _id: userId }, { $pull: { savedListingIds: listingId } });
  if (removed.modifiedCount === 1) {
    await properties.updateOne({ _id: listingId, savesCount: { $gt: 0 } }, { $inc: { savesCount: -1 } });
  }
  return NextResponse.json({ saved: false });
}
