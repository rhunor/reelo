import Link from "next/link";
import type { Transaction } from "@/types/models";
import { TRANSACTION_TYPE_LABEL } from "@/lib/transaction-labels";

const TYPE_LABEL: Record<string, string> = TRANSACTION_TYPE_LABEL;

export function TransactionHistory({
  transactions,
  currentUserId,
}: {
  transactions: Transaction[];
  currentUserId: string;
}) {
  if (transactions.length === 0) {
    return <p className="mt-8 text-foreground/70">No transactions yet.</p>;
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {transactions.map((transaction) => {
        const isPayer = transaction.payerId.toString() === currentUserId;
        return (
          <Link
            key={transaction._id!.toString()}
            href={`/transactions/${transaction._id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 hover:border-clay"
          >
            <div className="min-w-0">
              <p className="font-medium">{TYPE_LABEL[transaction.type] ?? transaction.type}</p>
              <p className="mt-1 text-xs text-foreground/50">
                {isPayer ? "Paid" : "Received"} · {new Date(transaction.createdAt).toLocaleDateString()} ·
                Ref: {transaction.providerReference}
              </p>
            </div>
            <p className={`shrink-0 font-mono font-medium ${isPayer ? "text-foreground" : "text-verified"}`}>
              {isPayer ? "-" : "+"}₦{transaction.amountNGN.toLocaleString()}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
