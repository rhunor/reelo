// Only approved referral earnings can ever leave Reallow as cash. Wallet top-ups and refunds
// credited to the wallet can only be spent on Reallow (inspection fees and other payments).
//
// Withdrawable = approved earnings − withdrawals already paid or waiting, and never more
// than the wallet actually holds (earnings that were spent on Reallow are gone). Shared by
// the withdrawal API (which enforces it) and the wallet panel (which shows it).
export function withdrawableNGN({
  walletBalanceNGN,
  approvedEarningsNGN,
  withdrawnOrPendingNGN,
}: {
  walletBalanceNGN: number;
  approvedEarningsNGN: number;
  withdrawnOrPendingNGN: number;
}): number {
  return Math.max(0, Math.min(walletBalanceNGN, approvedEarningsNGN - withdrawnOrPendingNGN));
}
