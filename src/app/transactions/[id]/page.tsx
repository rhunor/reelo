import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  rent: "Rent",
  deposit: "Caution fee",
  estate_charge: "Estate charge",
  platform_commission: "Reallow agency fee",
  legal_fee: "Legal fee",
  listing_verification: "Listing verification fee",
  inspection_fee: "Inspection fee",
  caution_fee_refund: "Caution fee refund",
};

export default async function TransactionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ObjectId.isValid(id)) notFound();

  const { transactions, properties, users } = await getCollections();
  const transaction = await transactions.findOne({ _id: new ObjectId(id) });
  if (!transaction) notFound();

  const isStaff = session.user.role === "admin" || session.user.role === "support";
  const isPayer = transaction.payerId.toString() === session.user.id;
  const isPayee = transaction.payeeId?.toString() === session.user.id;
  if (!isStaff && !isPayer && !isPayee) notFound();

  const [listing, payer, payee] = await Promise.all([
    transaction.listingId ? properties.findOne({ _id: transaction.listingId }) : null,
    users.findOne({ _id: transaction.payerId }),
    transaction.payeeId ? users.findOne({ _id: transaction.payeeId }) : null,
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Receipt</h1>
      <p className="mt-1 text-sm text-foreground/50">
        Use your browser&apos;s print/save-as-PDF to keep a copy of this page.
      </p>

      <div className="mt-6 rounded-lg border border-line p-6">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground/50">Description</dt>
            <dd className="font-medium">{TYPE_LABEL[transaction.type] ?? transaction.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">Amount</dt>
            <dd className="font-mono font-medium">₦{transaction.amountNGN.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">Date</dt>
            <dd>{new Date(transaction.createdAt).toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">Reference</dt>
            <dd className="break-all text-right">{transaction.providerReference}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">Status</dt>
            <dd className="capitalize">{transaction.status}</dd>
          </div>
          {payer && (
            <div className="flex justify-between">
              <dt className="text-foreground/50">Paid by</dt>
              <dd>{payer.name}</dd>
            </div>
          )}
          {payee && (
            <div className="flex justify-between">
              <dt className="text-foreground/50">Paid to</dt>
              <dd>{payee.name}</dd>
            </div>
          )}
          {listing && (
            <div className="flex justify-between">
              <dt className="text-foreground/50">Property</dt>
              <dd className="text-right">{listing.title}</dd>
            </div>
          )}
        </dl>
      </div>

      <p className="mt-4 text-xs text-foreground/50">
        All Reallow payments settle into Reallow&apos;s own account — this receipt confirms a
        payment made through Reallow, not a direct transfer to another user.
      </p>
    </div>
  );
}
