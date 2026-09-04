// Single source of truth for property type options — used by both listing-creation forms
// (landlord + admin) and the /listings search filter. Keeping this one fixed list (rather
// than free text) means a tenant's search filter actually matches what landlords picked,
// instead of "Duplex" vs "duplex" vs "2 bedroom duplex" never lining up.
export const PROPERTY_TYPES = [
  "Bungalow",
  "Duplex",
  "Semi-Detached Duplex",
  "Terrace House",
  "Block of Flats",
  "Flat / Apartment",
  "Apartment Complex",
  "Mini Flat / Self-Contain",
  "Mansion",
  "Penthouse",
  "Story Building",
  "Land",
  "Office Space",
  "Shop / Store",
  "Warehouse",
  "Event Center / Hall",
  "Co-working Space",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
