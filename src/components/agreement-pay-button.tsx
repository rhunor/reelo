"use client";

import { PayChoice } from "@/components/pay-choice";

export function AgreementPayButton({
  agreementId,
  amountNGN,
  walletBalanceNGN = 0,
  label,
}: {
  agreementId: string;
  amountNGN: number;
  walletBalanceNGN?: number;
  label: string;
}) {
  return (
    <PayChoice
      endpoint={`/api/agreements/${agreementId}/pay-checkout`}
      amountNGN={amountNGN}
      walletBalanceNGN={walletBalanceNGN}
      label={label}
    />
  );
}
