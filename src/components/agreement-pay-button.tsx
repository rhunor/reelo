"use client";

import { PayChoice } from "@/components/pay-choice";

// Rent and purchase payments are card-only: Paystack splits each one between the owner and
// Reallow at the point of payment, so a wallet balance can't be used for them.
export function AgreementPayButton({
  agreementId,
  amountNGN,
  label,
}: {
  agreementId: string;
  amountNGN: number;
  walletBalanceNGN?: number;
  label: string;
}) {
  return (
    <PayChoice endpoint={`/api/agreements/${agreementId}/pay-checkout`} amountNGN={amountNGN} walletBalanceNGN={0} label={label} />
  );
}
