import { NextResponse } from "next/server";

// Adding money to a Reallow wallet is switched off: Reallow doesn't hold customer money (see
// lib/paystack.ts). Every fee is paid by card at the time, through Paystack. Kept as a route
// so older app versions get a clear answer instead of a 404.
export async function POST() {
  return NextResponse.json(
    { error: "Adding money to your wallet is no longer available — pay each fee by card when it's due." },
    { status: 410 },
  );
}
