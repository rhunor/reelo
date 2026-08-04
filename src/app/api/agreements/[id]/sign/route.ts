import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import type { AgreementStatus } from "@/types/models";

const schema = z.object({ fullName: z.string().min(2) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || (session.user.role !== "landlord" && session.user.role !== "tenant")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your full name to sign" }, { status: 400 });
  }

  const { agreements } = await getCollections();
  const agreement = await agreements.findOne({ _id: new ObjectId(id) });
  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  const party = session.user.role as "landlord" | "tenant";
  const expectedPartyId = party === "landlord" ? agreement.landlordId : agreement.tenantId;
  if (expectedPartyId.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not a party to this agreement" }, { status: 403 });
  }
  if (agreement.signatures.some((signature) => signature.party === party)) {
    return NextResponse.json({ error: "You have already signed this agreement" }, { status: 409 });
  }

  const now = new Date();
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const signatureHash = createHash("sha256")
    .update(`${parsed.data.fullName}|${session.user.id}|${now.toISOString()}`)
    .digest("hex");

  const otherPartySigned = agreement.signatures.some((signature) => signature.party !== party);
  const nextStatus: AgreementStatus = otherPartySigned
    ? "fully_signed"
    : party === "landlord"
      ? "signed_by_landlord"
      : "signed_by_tenant";

  await agreements.updateOne(
    { _id: agreement._id },
    {
      $push: { signatures: { party, signedAt: now, signatureHash, ipAddress } },
      $set: { status: nextStatus, updatedAt: now },
    },
  );

  return NextResponse.json({ success: true, status: nextStatus });
}
