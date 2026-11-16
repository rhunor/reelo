import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listBanks } from "@/lib/paystack";

// Banks for the payout-account form. Cached for a day — Paystack's list rarely changes.
let cache: { at: number; banks: Awaited<ReturnType<typeof listBanks>> } | null = null;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!cache || Date.now() - cache.at > 24 * 3600 * 1000) cache = { at: Date.now(), banks: await listBanks() };
    return NextResponse.json({ banks: cache.banks });
  } catch {
    return NextResponse.json({ error: "Couldn't load the list of banks — try again shortly." }, { status: 502 });
  }
}
