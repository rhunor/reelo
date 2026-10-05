"use client";

import { PayChoice } from "@/components/pay-choice";

export function AgreementPayButton({
  agreementId,
  amountNGN,
  walletBalanceNGN = 0,
}: {
  agreementId: string;
  amountNGN: number;
  walletBalanceNGN?: number;
}) {
  return (
    <PayChoice
      endpoint={`/api/agreements/${agreementId}/pay-checkout`}
      amountNGN={amountNGN}
      walletBalanceNGN={walletBalanceNGN}
      label={`Pay ₦${amountNGN.toLocaleString()} via Reallow`}
    />
  );
}
