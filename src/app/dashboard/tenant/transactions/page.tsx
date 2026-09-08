import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { TransactionHistory } from "@/components/transaction-history";

export const dynamic = "force-dynamic";

export default async function TenantTransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { transactions } = await getCollections();
  const userId = new ObjectId(session.user.id);
  const mine = await transactions
    .find({ $or: [{ payerId: userId }, { payeeId: userId }] })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Transaction history</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Every payment you&apos;ve made or received through Reallow.
      </p>
      <TransactionHistory transactions={mine} currentUserId={session.user.id} />
    </div>
  );
}
