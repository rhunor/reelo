// Compact Naira formatting for tight spaces (map pins, badges) — "₦1M" rather than the
// previous "₦1000k", which read as a confusing/wrong number at prices ≥ ₦1,000,000.
export function formatCompactNaira(amountNGN: number): string {
  if (amountNGN >= 1_000_000_000) {
    return `₦${trimTrailingZero(amountNGN / 1_000_000_000)}B`;
  }
  if (amountNGN >= 1_000_000) {
    return `₦${trimTrailingZero(amountNGN / 1_000_000)}M`;
  }
  if (amountNGN >= 1_000) {
    return `₦${trimTrailingZero(amountNGN / 1_000)}k`;
  }
  return `₦${amountNGN}`;
}

function trimTrailingZero(value: number): string {
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}
