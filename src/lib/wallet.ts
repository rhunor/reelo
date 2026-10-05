import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";

// Takes `amountNGN` out of a user's wallet only if the balance covers it — the balance
// check and the decrement are one conditional update, so two simultaneous payments can
// never both spend the same naira. Returns false (and changes nothing) if it doesn't.
export async function debitWallet(userId: ObjectId, amountNGN: number): Promise<boolean> {
  if (amountNGN <= 0) return false;
  const { users } = await getCollections();
  const result = await users.updateOne(
    { _id: userId, walletBalanceNGN: { $gte: amountNGN } },
    { $inc: { walletBalanceNGN: -amountNGN }, $set: { updatedAt: new Date() } },
  );
  return result.modifiedCount === 1;
}

export async function creditWallet(userId: ObjectId, amountNGN: number): Promise<void> {
  const { users } = await getCollections();
  await users.updateOne(
    { _id: userId },
    { $inc: { walletBalanceNGN: amountNGN }, $set: { updatedAt: new Date() } },
  );
}

export function walletReference(kind: string, id: ObjectId | string): string {
  return `wallet_${kind}_${id}_${Date.now()}`;
}
