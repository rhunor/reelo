// Single source of truth for supported locations — used by listing-creation forms, the
// /listings search filter, and the map. Deliberately a closed list rather than free text:
// it eliminates location-typo spam ("Kano" when Reallow only operates in Abuja), and lets
// every listing carry a pre-verified [lng, lat] instead of depending on a geocoder's
// best-effort guess at arbitrary text (the previous source of listings landing on the
// wrong spot on the map).
export const SUPPORTED_STATES = [
  { value: "Abuja", label: "Abuja (FCT)" },
  { value: "Port Harcourt", label: "Port Harcourt (Rivers)" },
  { value: "Warri", label: "Warri (Delta)" },
] as const;

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

export const PORT_HARCOURT_DISTRICTS: District[] = [
  { value: "Old GRA", label: "Old GRA", coordinates: [7.01167, 4.78139] },
  { value: "New GRA", label: "New GRA", coordinates: [7.00336, 4.82133] },
  { value: "Trans Amadi", label: "Trans Amadi", coordinates: [7.03722, 4.81472] },
  { value: "D-Line", label: "D-Line", coordinates: [7.00278, 4.80222] },
  { value: "Woji", label: "Woji", coordinates: [6.99525, 4.81655] },
  { value: "Rumuola", label: "Rumuola", coordinates: [6.9952, 4.83383] },
];

export const WARRI_DISTRICTS: District[] = [
  { value: "Effurun", label: "Effurun", coordinates: [5.75, 5.517] },
  { value: "Osubi", label: "Osubi", coordinates: [5.81944, 5.59722] },
  { value: "Uvwie", label: "Uvwie (Warri GRA / Ekpan)", coordinates: [5.76667, 5.55] },
];

export const DISTRICTS_BY_STATE: Record<SupportedState, District[]> = {
  Abuja: ABUJA_DISTRICTS,
  "Port Harcourt": PORT_HARCOURT_DISTRICTS,
  Warri: WARRI_DISTRICTS,
};

export function findDistrict(state: string, city: string): District | undefined {
  return DISTRICTS_BY_STATE[state as SupportedState]?.find((d) => d.value === city);
}
