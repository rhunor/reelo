// Single source of truth for every Reallow-side fee/percentage. Both the UI (what a
// tenant/landlord is shown) and the API routes (what's actually validated/charged) import
// from here, so the displayed number and the enforced number can never drift apart.

import type { ListingType } from "@/types/models";

// Reallow's service charge — paid by the tenant/buyer on top of the price, so the
// landlord/seller always receives their full asking amount. Flat in every city.
export const SERVICE_CHARGE_RATE: Record<ListingType, number> = {
  rent: 0.1, // 10% of annual rent
  sale: 0.05, // 5% of sale price
};

export function getServiceChargeRate(listingType: ListingType = "rent"): number {
  return SERVICE_CHARGE_RATE[listingType];
}

export function formatRate(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export const CAUTION_FEE_CAP_RATE = 0.12; // caution fee can't exceed 12% of annual rent
// The absolute platform floor for how short a lease can be lives in listing-verification.ts
// (MINIMUM_LEASE_TERM_MONTHS) — each listing can set its own minimum at or above that floor.

// Reallow's agent has to physically travel to the property for an inspection — the fee
// covers that logistics cost and varies by district. Keyed by the same `city`/district
// value used in src/lib/locations.ts.
export const INSPECTION_FEE_BY_DISTRICT: Record<string, number> = {
  Wuse: 5_000,
  Maitama: 7_000,
  Asokoro: 7_000,
  Garki: 5_000,
  Gwarinpa: 6_000,
  Jabi: 5_000,
  "Life Camp": 6_000,
  Katampe: 6_000,
  Utako: 5_000,
  Wuye: 5_000,
  Lugbe: 8_000,
};

export const DEFAULT_INSPECTION_FEE_NGN = 6_000;

// Every meeting between a landlord and an applicant carries this inspection fee, paid by
// the applicant (tenant or buyer) before the meeting can go ahead. It covers the Reallow
// agent who attends.
export const MEETING_FEE_NGN = 10_000;

export function getInspectionFee(city: string): number {
  return INSPECTION_FEE_BY_DISTRICT[city] ?? DEFAULT_INSPECTION_FEE_NGN;
}

export function capCautionFee(cautionFeeNGN: number, annualRentNGN: number): boolean {
  return cautionFeeNGN <= annualRentNGN * CAUTION_FEE_CAP_RATE;
}

export interface ListingCostBreakdown {
  listingType: ListingType;
  // Annual rent, or the sale price.
  priceNGN: number;
  // Rent only — always 0 for a sale.
  cautionFeeNGN: number;
  estateChargeNGN: number;
  serviceChargeRate: number;
  serviceChargeNGN: number;
  // What the tenant/buyer pays in total.
  totalNGN: number;
  // What reaches the landlord/seller: everything except Reallow's service charge.
  toOwnerNGN: number;
  // What Reallow keeps — the service charge.
  toReallowNGN: number;
}

// Used for the listing review step, the listing page, and what's actually charged at
// agreement-pay time (src/app/api/agreements/[id]/pay-checkout/route.ts) — one function so
// those numbers can never disagree.
export function computeListingCostBreakdown({
  listingType = "rent",
  priceNGN,
  cautionFeeNGN = 0,
  estateChargeNGN = 0,
  serviceChargeRate,
}: {
  listingType?: ListingType;
  priceNGN: number;
  cautionFeeNGN?: number;
  estateChargeNGN?: number;
  // Override for agreements that recorded the rate they were created at.
  serviceChargeRate?: number;
}): ListingCostBreakdown {
  const isRent = listingType === "rent";
  const caution = isRent ? cautionFeeNGN : 0;
  const estate = isRent ? estateChargeNGN : 0;
  const rate = serviceChargeRate ?? getServiceChargeRate(listingType);
  const serviceChargeNGN = Math.round(priceNGN * rate);
  const toOwnerNGN = priceNGN + caution + estate;

  return {
    listingType,
    priceNGN,
    cautionFeeNGN: caution,
    estateChargeNGN: estate,
    serviceChargeRate: rate,
    serviceChargeNGN,
    totalNGN: toOwnerNGN + serviceChargeNGN,
    toOwnerNGN,
    toReallowNGN: serviceChargeNGN,
  };
}

// Tenancy agreements are rentals. Uses the rate snapshotted on the agreement when present,
// so a later rate change never alters an agreement that's already been drafted.
export function computeAgreementTotal(terms: {
  rentNGN: number;
  depositNGN?: number;
  estateChargeNGN?: number;
  serviceChargeRate?: number;
}): ListingCostBreakdown {
  return computeListingCostBreakdown({
    listingType: "rent",
    priceNGN: terms.rentNGN,
    cautionFeeNGN: terms.depositNGN,
    estateChargeNGN: terms.estateChargeNGN,
    serviceChargeRate: terms.serviceChargeRate,
  });
}
