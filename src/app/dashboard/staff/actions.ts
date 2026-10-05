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

export type VisitReportFormState = { status: "idle" | "success" | "error"; message?: string };

const CONDITIONS = ["matches", "minor_differences", "does_not_match"] as const;

// The agent's report once a verification visit is done: how the property compares with
// the listing, comments, a fuller narration, and photos taken on site. Saving again
// replaces the previous report. Returns form state instead of throwing (useActionState).
export async function submitVisitReport(
  _previous: VisitReportFormState,
  formData: FormData,
): Promise<VisitReportFormState> {
  const agent = await requireStaff();
  const listingId = formData.get("listingId") as string;
  const condition = formData.get("condition") as (typeof CONDITIONS)[number];
  const comments = ((formData.get("comments") as string) ?? "").trim().slice(0, 2000);
  const narration = ((formData.get("narration") as string) ?? "").trim().slice(0, 8000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const photoUrls = formData
    .getAll("photoUrls")
    .map(String)
    .filter((url) => url.startsWith(`https://res.cloudinary.com/${cloudName}/`))
    .slice(0, 40);

  if (!ObjectId.isValid(listingId)) return { status: "error", message: "Listing not found." };
  if (!CONDITIONS.includes(condition)) return { status: "error", message: "Say how the property compares with the listing." };
  if (narration.length < 20) {
    return { status: "error", message: "Write a short narration of the property (at least a sentence or two)." };
  }
  if (photoUrls.length === 0) return { status: "error", message: "Add at least one photo from the visit." };

  const { properties, users } = await getCollections();
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
          comments,
          narration,
          photoUrls,
          submittedAt: new Date(),
          submittedBy: new ObjectId(agent.id),
          submittedByName: me?.name,
        },
        updatedAt: new Date(),
      },
    },
  );

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/admin");
  return { status: "success", message: "Report saved — Reallow admin can now review it." };
}
