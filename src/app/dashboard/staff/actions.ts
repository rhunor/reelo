"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "staff" && session.user.role !== "admin")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

const TASK_KEYS = ["videoOfProperty", "videoOfRoad", "photos"] as const;
type TaskKey = (typeof TASK_KEYS)[number];

export async function toggleVerificationTask(formData: FormData) {
  await requireStaff();
  const listingId = formData.get("listingId") as string;
  const task = formData.get("task") as TaskKey;
  if (!TASK_KEYS.includes(task)) throw new Error("Invalid task");

  const { properties } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) });
  if (!listing) throw new Error("Listing not found");

  const current = Boolean(listing.verification.tasks?.[task]);
  await properties.updateOne(
    { _id: listing._id },
    { $set: { [`verification.tasks.${task}`]: !current, updatedAt: new Date() } },
  );

  revalidatePath("/dashboard/staff");
}

export async function completeInspectionVisit(formData: FormData) {
  await requireStaff();
  const bookingId = formData.get("bookingId") as string;

  const { inspectionBookings } = await getCollections();
  await inspectionBookings.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: { status: "completed" } },
  );

  revalidatePath("/dashboard/staff");
}

// Media the field agent captures *is* the listing's verification media — it lands
// straight on the listing's own photoUrls/videoUrls, the same arrays the public listing
// page and the admin approval queue already read from. Called directly (not via a <form>)
// from the client uploader component the moment each upload finishes.
export async function addVerificationMedia(listingId: string, kind: "photo" | "video", urls: string[]) {
  await requireStaff();
  if (urls.length === 0) return;

  const { properties } = await getCollections();
  if (kind === "video") {
    await properties.updateOne(
      { _id: new ObjectId(listingId) },
      { $push: { videoUrls: { $each: urls } }, $set: { updatedAt: new Date() } },
    );
  } else {
    await properties.updateOne(
      { _id: new ObjectId(listingId) },
      { $push: { photoUrls: { $each: urls } }, $set: { updatedAt: new Date() } },
    );
  }

  revalidatePath("/dashboard/staff");
}
