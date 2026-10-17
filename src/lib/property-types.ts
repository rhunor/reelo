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

// Translation key for a property type's display label — the stored value stays English.
export function propertyTypeKey(type: string): string {
  return "ptype." + type.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
}

// Which listing details make sense for each property type. Land has no rooms or furniture;
// a warehouse, shop or hall has toilets but no bedrooms and isn't "furnished"; offices and
// co-working spaces can be furnished but have no bedrooms. Forms hide what doesn't apply and
// the API drops it, so a listing never says "Land · Furnished · 3 bedrooms".
export interface PropertyTypeFields {
  bedrooms: boolean;
  bathrooms: boolean;
  furnishing: boolean;
  // Completed / carcass / under construction — for buildings offered for sale.
  completion: boolean;
}

const RESIDENTIAL: PropertyTypeFields = { bedrooms: true, bathrooms: true, furnishing: true, completion: true };

const FIELDS_BY_TYPE: Partial<Record<PropertyType, PropertyTypeFields>> = {
  Land: { bedrooms: false, bathrooms: false, furnishing: false, completion: false },
  "Office Space": { bedrooms: false, bathrooms: true, furnishing: true, completion: true },
  "Co-working Space": { bedrooms: false, bathrooms: true, furnishing: true, completion: true },
  "Shop / Store": { bedrooms: false, bathrooms: true, furnishing: false, completion: true },
  Warehouse: { bedrooms: false, bathrooms: true, furnishing: false, completion: true },
  "Event Center / Hall": { bedrooms: false, bathrooms: true, furnishing: false, completion: true },
};

export function propertyTypeFields(type: string | undefined): PropertyTypeFields {
  return FIELDS_BY_TYPE[type as PropertyType] ?? RESIDENTIAL;
}

// How finished a building for sale is. "Carcass" is the Nigerian building term for a roofed
// shell with no finishing (plastering, windows, doors, fittings).
export const COMPLETION_STATUSES = ["completed", "carcass", "under_construction"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

// Dimensions (length × width) are compulsory for land and for anything for sale — buyers need
// the plot or floor size — and optional for other rentals.
export function dimensionsRequired(propertyType: string | undefined, listingType: "rent" | "sale"): boolean {
  return propertyType === "Land" || listingType === "sale";
}

export type DimensionUnit = "ft" | "m";

// "50 × 100 ft (5,000 sq ft)"
export function formatDimensions(d: { length: number; width: number; unit: DimensionUnit }): string {
  const area = Math.round(d.length * d.width);
  const unit = d.unit === "m" ? "m" : "ft";
  const areaUnit = d.unit === "m" ? "m²" : "sq ft";
  return `${d.length.toLocaleString()} × ${d.width.toLocaleString()} ${unit} (${area.toLocaleString()} ${areaUnit})`;
}

// Server-side: keep only the details that apply to this property type and listing type.
// Returns an error when a building for sale is missing its completion status.
export function applyPropertyTypeRules(input: {
  propertyType: string;
  listingType: "rent" | "sale";
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: "furnished" | "semi_furnished" | "unfurnished";
  completionStatus?: CompletionStatus;
  dimensions?: { length: number; width: number; unit: DimensionUnit };
}):
  | {
      ok: true;
      bedrooms?: number;
      bathrooms?: number;
      furnishing?: PropertyFurnishing;
      completionStatus?: CompletionStatus;
      dimensions?: { length: number; width: number; unit: DimensionUnit };
    }
  | { ok: false; error: string } {
  const fields = propertyTypeFields(input.propertyType);
  const needsCompletion = input.listingType === "sale" && fields.completion;
  if (needsCompletion && !input.completionStatus) {
    return { ok: false, error: "Say whether the building is completed, a carcass, or under construction" };
  }
  if (dimensionsRequired(input.propertyType, input.listingType) && !input.dimensions) {
    return { ok: false, error: "Enter the property's dimensions (length × width)" };
  }
  return {
    ok: true,
    bedrooms: fields.bedrooms ? input.bedrooms : undefined,
    bathrooms: fields.bathrooms ? input.bathrooms : undefined,
    furnishing: fields.furnishing ? input.furnishing : undefined,
    completionStatus: needsCompletion ? input.completionStatus : undefined,
    dimensions: input.dimensions,
  };
}

type PropertyFurnishing = "furnished" | "semi_furnished" | "unfurnished";
