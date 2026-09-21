// Single source of truth for every Reallow-side fee/percentage. Both the UI (what a
// tenant/landlord is shown) and the API routes (what's actually validated/charged) import
// from here, so the displayed number and the enforced number can never drift apart.

// Agency fee varies by city — Reallow prices under the local market standard in each
// (Abuja's standard is ~10%, PH's is ~20%; Reallow charges below both). Keyed by the same
// `state` value used in src/lib/locations.ts.
export const AGENCY_FEE_RATE_BY_STATE: Record<string, number> = {
  Abuja: 0.09,
  "Port Harcourt": 0.15,
  Warri: 0.15,
};
export const DEFAULT_AGENCY_FEE_RATE = 0.09;

export function getAgencyFeeRate(state?: string): number {
  if (!state) return DEFAULT_AGENCY_FEE_RATE;
  return AGENCY_FEE_RATE_BY_STATE[state] ?? DEFAULT_AGENCY_FEE_RATE;
}

export const LEGAL_FEE_NGN = 50_000; // flat
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

export function getInspectionFee(city: string): number {
  return INSPECTION_FEE_BY_DISTRICT[city] ?? DEFAULT_INSPECTION_FEE_NGN;
}

export function capCautionFee(cautionFeeNGN: number, annualRentNGN: number): boolean {
  return cautionFeeNGN <= annualRentNGN * CAUTION_FEE_CAP_RATE;
}

export interface ListingCostBreakdown {
  rentNGN: number;
  cautionFeeNGN: number;
  estateChargeNGN: number;
  agencyFeeNGN: number;
  legalFeeNGN: number;
  totalNGN: number;
}

// Used both for display (listing detail page) and for what's actually charged at
// agreement-pay time (src/app/api/agreements/[id]/pay-checkout/route.ts).
export function computeListingCostBreakdown({
  rentNGN,
  cautionFeeNGN = 0,
  estateChargeNGN = 0,
  state,
}: {
  rentNGN: number;
  cautionFeeNGN?: number;
  estateChargeNGN?: number;
  state?: string;
}): ListingCostBreakdown {
  const agencyFeeNGN = Math.round(rentNGN * getAgencyFeeRate(state));
  const legalFeeNGN = LEGAL_FEE_NGN;
  const totalNGN = rentNGN + cautionFeeNGN + estateChargeNGN + agencyFeeNGN + legalFeeNGN;

  return { rentNGN, cautionFeeNGN, estateChargeNGN, agencyFeeNGN, legalFeeNGN, totalNGN };
}

// Alias used at agreement-pay time — same shape, named for where it's called from so the
// call site reads clearly (an Agreement's terms, not a Property's listed price). `state` is
// optional so agreements created before this field existed still compute (falling back to
// DEFAULT_AGENCY_FEE_RATE) instead of crashing.
export function computeAgreementTotal(terms: {
  rentNGN: number;
  depositNGN?: number;
  estateChargeNGN?: number;
  state?: string;
}): ListingCostBreakdown {
  return computeListingCostBreakdown({
    rentNGN: terms.rentNGN,
    cautionFeeNGN: terms.depositNGN,
    estateChargeNGN: terms.estateChargeNGN,
    state: terms.state,
  });
}
