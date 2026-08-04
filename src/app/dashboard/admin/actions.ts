"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

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

  revalidatePath("/dashboard/admin");
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
