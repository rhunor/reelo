import type { SubscriptionTier } from "@/types/models";

// "canContactReallow" gates opening a listing-scoped ticket (asking Reallow about a
// property) and booking an inspection — tenants never contact landlords directly,
// Reallow is the intermediary for both. See project notes: no peer-to-peer chat.
export const SUBSCRIPTION_TIERS: Record<
  SubscriptionTier,
  {
    label: string;
    priceNGN: number;
    inspectionBookingLimit: number | null;
    canContactReallow: boolean;
  }
> = {
  free: {
    label: "Free",
    priceNGN: 0,
    inspectionBookingLimit: 0,
    canContactReallow: false,
  },
  pro: {
    label: "Pro",
    priceNGN: 3000,
    inspectionBookingLimit: 5,
    canContactReallow: true,
  },
  pro_plus: {
    label: "Pro+",
    priceNGN: 7000,
    inspectionBookingLimit: null,
    canContactReallow: true,
  },
};

export function canBookInspection(
  tier: SubscriptionTier,
  inspectionBookingsUsedThisPeriod: number,
): boolean {
  const limit = SUBSCRIPTION_TIERS[tier].inspectionBookingLimit;
  if (limit === null) return true;
  return inspectionBookingsUsedThisPeriod < limit;
}

export function canContactReallow(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_TIERS[tier].canContactReallow;
}
