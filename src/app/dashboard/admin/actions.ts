"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { notifySavedSearchMatches } from "@/lib/notifications";
import { distanceMeters, CHECK_IN_DISTANCE_WARNING_METERS } from "@/lib/geo";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function scheduleInspection(formData: FormData) {
  await requireAdmin();
  const listingId = formData.get("listingId") as string;
  const scheduledFor = formData.get("scheduledFor") as string;

  const { properties } = await getCollections();
  const now = new Date();

  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        "verification.scheduledFor": new Date(scheduledFor),
        updatedAt: now,
      },
    },
  );

  revalidatePath("/dashboard/admin");
}

export async function approveListing(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = formData.get("listingId") as string;

  const { properties } = await getCollections();
  const now = new Date();

  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        status: "published",
        "verification.reviewedBy": new ObjectId(admin.id),
        "verification.reviewedAt": now,
        updatedAt: now,
      },
    },
  );

  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (listing) await notifySavedSearchMatches(listing);

  revalidatePath("/dashboard/admin");
}

export async function checkInAtListing(formData: FormData) {
  const staff = await requireAdmin();
  const listingId = formData.get("listingId") as string;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");

  const now = new Date();
  let flagged = false;

  if (listing.location.coordinates) {
    const distance = distanceMeters(
      { lat, lng },
      { lat: listing.location.coordinates[1], lng: listing.location.coordinates[0] },
    );
    flagged = distance > CHECK_IN_DISTANCE_WARNING_METERS;
  }

  await properties.updateOne(
    { _id: listing._id },
    {
      $set: {
        "verification.checkedInAt": now,
        "verification.checkedInBy": new ObjectId(staff.id),
        "verification.checkedInLocation": { lat, lng },
        updatedAt: now,
      },
    },
  );

  revalidatePath("/dashboard/admin");
  return { flagged };
}

export async function rejectListing(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = formData.get("listingId") as string;
  const reason = (formData.get("reason") as string) || "Did not pass verification inspection";

  const { properties } = await getCollections();
  const now = new Date();

  await properties.updateOne(
    { _id: new ObjectId(listingId) },
    {
      $set: {
        status: "rejected",
        "verification.reviewedBy": new ObjectId(admin.id),
        "verification.reviewedAt": now,
        "verification.rejectionReason": reason,
        updatedAt: now,
      },
    },
  );

  revalidatePath("/dashboard/admin");
}
