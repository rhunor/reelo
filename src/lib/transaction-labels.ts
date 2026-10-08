import type { TransactionType } from "@/types/models";

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  rent: "Rent",
  deposit: "Caution fee",
  estate_charge: "Estate charge",
  platform_commission: "Reallow service charge",
  legal_fee: "Legal fee",
  listing_verification: "Listing verification fee",
  inspection_fee: "Inspection fee",
  caution_fee_refund: "Caution fee refund",
  inspection_fee_refund: "Inspection fee refund",
  wallet_funding: "Wallet top-up",
};
