import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

const schema = z.object({
  agreementId: z.string(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "tenant" && session.user.role !== "landlord")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success || !ObjectId.isValid(parsed.data.agreementId)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { agreements, reviews, users } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(parsed.data.agreementId) });
  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }
  if (agreement.payment.status === "unpaid") {
    return NextResponse.json(
      { error: "You can only review after rent & deposit have been paid" },
      { status: 409 },
    );
  }

  const role = session.user.role as "tenant" | "landlord";
  const expectedPartyId = role === "landlord" ? agreement.landlordId : agreement.tenantId;
  if (expectedPartyId.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not a party to this agreement" }, { status: 403 });
  }

  const toUserId = role === "landlord" ? agreement.tenantId : agreement.landlordId;

  const existing = await reviews.findOne({
    agreementId: agreement._id,
    fromUserId: new ObjectId(session.user.id),
  });
  if (existing) {
    return NextResponse.json({ error: "You already reviewed this tenancy" }, { status: 409 });
  }

  const now = new Date();
  await reviews.insertOne({
    listingId: agreement.listingId,
    agreementId: agreement._id!,
    fromUserId: new ObjectId(session.user.id),
    fromRole: role,
    toUserId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    createdAt: now,
  });

  const stats = await reviews
    .aggregate<{ _id: null; average: number; count: number }>([
      { $match: { toUserId } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();

  await users.updateOne(
    { _id: toUserId },
    {
      $set: {
        ratingAverage: stats[0]?.average ?? parsed.data.rating,
        ratingCount: stats[0]?.count ?? 1,
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ success: true });
}
