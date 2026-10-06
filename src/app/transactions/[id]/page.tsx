import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

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
  const t = await getT();

  const [listing, payer, payee] = await Promise.all([
    transaction.listingId ? properties.findOne({ _id: transaction.listingId }) : null,
    users.findOne({ _id: transaction.payerId }),
    transaction.payeeId ? users.findOne({ _id: transaction.payeeId }) : null,
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">{t("receipt.title")}</h1>
      <p className="mt-1 text-sm text-foreground/50">{t("receipt.printHint")}</p>

      <div className="mt-6 rounded-lg border border-line p-6">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground/50">{t("form.descriptionLabel")}</dt>
            <dd className="font-medium">{t(`txType.${transaction.type}` as MessageKey)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">{t("wallet.amount")}</dt>
            <dd className="font-mono font-medium">₦{transaction.amountNGN.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">{t("receipt.date")}</dt>
            <dd>{new Date(transaction.createdAt).toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">{t("receipt.reference")}</dt>
            <dd className="break-all text-right">{transaction.providerReference}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/50">{t("receipt.status")}</dt>
            <dd>{t(`receipt.status.${transaction.status}` as MessageKey)}</dd>
          </div>
          {payer && (
            <div className="flex justify-between">
              <dt className="text-foreground/50">{t("receipt.paidBy")}</dt>
              <dd>{payer.name}</dd>
            </div>
          )}
          {payee && (
            <div className="flex justify-between">
              <dt className="text-foreground/50">{t("receipt.paidTo")}</dt>
              <dd>{payee.name}</dd>
            </div>
          )}
          {listing && (
            <div className="flex justify-between">
              <dt className="text-foreground/50">{t("agreement.property")}</dt>
              <dd className="text-right">{listing.title}</dd>
            </div>
          )}
        </dl>
      </div>

      <p className="mt-4 text-xs text-foreground/50">
        {t("receipt.footnote")}
      </p>
    </div>
  );
}
