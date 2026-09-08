// Single source of truth for supported locations — used by listing-creation forms, the
// /listings search filter, and the map. Deliberately a closed list rather than free text:
// it eliminates location-typo spam ("Kano" when Reallow only operates in Abuja), and lets
// every listing carry a pre-verified [lng, lat] instead of depending on a geocoder's
// best-effort guess at arbitrary text (the previous source of listings landing on the
// wrong spot on the map).
export const SUPPORTED_STATES = [{ value: "Abuja", label: "Abuja (FCT)" }] as const;

export type SupportedState = (typeof SUPPORTED_STATES)[number]["value"];

export interface District {
  value: string;
  label: string;
  coordinates: [number, number]; // [lng, lat]
}

export const ABUJA_DISTRICTS: District[] = [
  { value: "Wuse", label: "Wuse", coordinates: [7.4833, 9.0632] },
  { value: "Maitama", label: "Maitama", coordinates: [7.4951, 9.0921] },
  { value: "Asokoro", label: "Asokoro", coordinates: [7.5284, 9.0459] },
  { value: "Garki", label: "Garki", coordinates: [7.4898, 9.0333] },
  { value: "Gwarinpa", label: "Gwarinpa", coordinates: [7.4056, 9.1094] },
  { value: "Jabi", label: "Jabi", coordinates: [7.4238, 9.0765] },
  { value: "Life Camp", label: "Life Camp", coordinates: [7.4103, 9.1002] },
  { value: "Katampe", label: "Katampe", coordinates: [7.4547, 9.1103] },
  { value: "Utako", label: "Utako", coordinates: [7.4394, 9.0687] },
  { value: "Wuye", label: "Wuye", coordinates: [7.4614, 9.0512] },
  { value: "Lugbe", label: "Lugbe", coordinates: [7.3667, 8.9833] },
  { value: "Galadimawa", label: "Galadimawa", coordinates: [7.4306, 8.9847] },
];

export const DISTRICTS_BY_STATE: Record<SupportedState, District[]> = {
  Abuja: ABUJA_DISTRICTS,
};

export function findDistrict(state: string, city: string): District | undefined {
  return DISTRICTS_BY_STATE[state as SupportedState]?.find((d) => d.value === city);
}
