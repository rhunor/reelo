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

  const { inspectionBookings, meetings } = await getCollections();
  if (formData.get("source") === "meeting") {
    await meetings.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: "completed", updatedAt: new Date() } },
    );
  } else {
    await inspectionBookings.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: "completed" } },
    );
  }

  revalidatePath("/dashboard/staff");
}

export type VisitReportFormState = { status: "idle" | "success" | "error"; message?: string };

const CONDITIONS = ["matches", "minor_differences", "does_not_match"] as const;

// The agent's report once a verification visit is done: how the property compares with
// the listing, a 1–5 rating and comment, an optional narration, and photos/videos of the
// property and of the road to it. Saving again replaces the previous report. Returns form
// state instead of throwing (useActionState).
export async function submitVisitReport(
  _previous: VisitReportFormState,
  formData: FormData,
): Promise<VisitReportFormState> {
  const agent = await requireStaff();
  const listingId = formData.get("listingId") as string;
  const condition = formData.get("condition") as (typeof CONDITIONS)[number];
  const rating = Number(formData.get("rating"));
  const comments = ((formData.get("comments") as string) ?? "").trim().slice(0, 2000);
  const narration = ((formData.get("narration") as string) ?? "").trim().slice(0, 8000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const urls = (field: string, max: number) =>
    [...new Set(formData.getAll(field).map(String))]
      .filter((url) => url.startsWith(`https://res.cloudinary.com/${cloudName}/`))
      .slice(0, max);
  const photoUrls = urls("photoUrls", 40);
  const videoUrls = urls("videoUrls", 10);
  const roadPhotoUrls = urls("roadPhotoUrls", 20);
  const roadVideoUrls = urls("roadVideoUrls", 10);

  if (!ObjectId.isValid(listingId)) return { status: "error", message: "Listing not found." };
  if (!CONDITIONS.includes(condition)) return { status: "error", message: "Say how the property compares with the listing." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { status: "error", message: "Give the visit a star rating (1–5)." };
  if (photoUrls.length === 0) return { status: "error", message: "Add at least one photo of the property." };
  if (roadPhotoUrls.length === 0) return { status: "error", message: "Add at least one photo of the road to the property." };

  const { properties, users, meetingFeedback } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(listingId) }, { projection: { verification: 1 } });
  if (!listing) return { status: "error", message: "Listing not found." };
  const visited =
    Boolean(listing.verification.checkedInAt) ||
    Boolean(listing.verification.scheduledFor && new Date(listing.verification.scheduledFor).getTime() <= Date.now());
  if (!visited) return { status: "error", message: "Check in at the property (or wait for the visit time) before filing a report." };

  const me = await users.findOne({ _id: new ObjectId(agent.id) }, { projection: { name: 1 } });
  await properties.updateOne(
    { _id: listing._id },
    {
      $set: {
        "verification.agentReport": {
          condition,
          rating,
          comments,
          narration,
          photoUrls,
          videoUrls,
          roadPhotoUrls,
          roadVideoUrls,
          submittedAt: new Date(),
          submittedBy: new ObjectId(agent.id),
          submittedByName: me?.name,
        },
        // The checklist follows what was actually captured.
        "verification.tasks.photos": true,
        "verification.tasks.videoOfProperty": videoUrls.length > 0,
        "verification.tasks.videoOfRoad": roadVideoUrls.length > 0,
        updatedAt: new Date(),
      },
      // Property photos and videos become the listing's own verification media (road
      // media stays in the report only). $addToSet so re-saving doesn't duplicate them.
      $addToSet: { photoUrls: { $each: photoUrls }, videoUrls: { $each: videoUrls } },
    },
  );

  // The rating also goes in with the other visit ratings admin reviews; re-saving the
  // report updates it rather than adding another.
  await meetingFeedback.updateOne(
    { userId: new ObjectId(agent.id), targetType: "verification", targetId: listing._id },
    {
      $set: { rating, comment: comments || undefined, tags: [], listingId: listing._id },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/admin");
  return { status: "success", message: "Report saved — Reallow admin can now review it." };
}
