"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "support")) {
    throw new Error("Unauthorized");
  }
}

export async function resolveTicket(formData: FormData) {
  await requireStaff();
  const ticketId = formData.get("ticketId") as string;
  const { tickets } = await getCollections();
  await tickets.updateOne(
    { _id: new ObjectId(ticketId) },
    { $set: { status: "resolved", updatedAt: new Date() } },
  );
  revalidatePath("/dashboard/support");
}

export async function reopenTicket(formData: FormData) {
  await requireStaff();
  const ticketId = formData.get("ticketId") as string;
  const { tickets } = await getCollections();
  await tickets.updateOne(
    { _id: new ObjectId(ticketId) },
    { $set: { status: "open", updatedAt: new Date() } },
  );
  revalidatePath("/dashboard/support");
}
