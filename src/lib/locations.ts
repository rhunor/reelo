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

// Coordinates come from OpenStreetMap (place/boundary records, or for road-named areas
// like "Jakpa Road" the road itself), Wikidata, or a cited web source — never guessed.
// Where an area has no settlement record of its own, a landmark inside it (a market,
// junction, police station) stands in. `value` strings are stored on existing listings,
// so never rename one; add new entries instead. Kept alphabetical for the dropdown.
const sorted = (list: District[]): District[] => [...list].sort((a, b) => a.label.localeCompare(b.label));

export const ABUJA_DISTRICTS: District[] = sorted([
  { value: "Apo", label: "Apo", coordinates: [7.49954, 8.98406] },
  { value: "Asokoro", label: "Asokoro", coordinates: [7.5284, 9.0459] },
  { value: "Bwari", label: "Bwari", coordinates: [7.47187, 9.23575] },
  { value: "Central Business District", label: "Central Business District", coordinates: [7.48835, 9.05371] },
  { value: "Dakibiyu", label: "Dakibiyu", coordinates: [7.42064, 9.0412] },
  { value: "Dawaki", label: "Dawaki", coordinates: [7.3887, 9.12468] },
  { value: "Dei-Dei", label: "Dei-Dei", coordinates: [7.29494, 9.11174] },
  { value: "Durumi", label: "Durumi", coordinates: [7.46433, 9.01946] },
  { value: "Dutse", label: "Dutse", coordinates: [7.36861, 9.1394] },
  { value: "Galadimawa", label: "Galadimawa", coordinates: [7.4306, 8.9847] },
  { value: "Garki", label: "Garki", coordinates: [7.4898, 9.0333] },
  { value: "Gudu", label: "Gudu", coordinates: [7.4799, 9.00818] },
  { value: "Guzape", label: "Guzape", coordinates: [7.52, 9.01889] },
  { value: "Gwagwalada", label: "Gwagwalada", coordinates: [7.08591, 8.93603] },
  { value: "Gwarinpa", label: "Gwarinpa", coordinates: [7.4056, 9.1094] },
  { value: "Jabi", label: "Jabi", coordinates: [7.4238, 9.0765] },
  { value: "Jahi", label: "Jahi", coordinates: [7.43875, 9.10962] },
  { value: "Jikwoyi", label: "Jikwoyi", coordinates: [7.56415, 8.98398] },
  { value: "Kabusa", label: "Kabusa", coordinates: [7.43898, 8.96538] },
  { value: "Kado", label: "Kado", coordinates: [7.42744, 9.09067] },
  { value: "Kagini", label: "Kagini", coordinates: [7.29875, 9.13267] },
  { value: "Karmo", label: "Karmo", coordinates: [7.37477, 9.05559] },
  { value: "Karu", label: "Karu", coordinates: [7.57505, 9.01135] },
  { value: "Katampe", label: "Katampe", coordinates: [7.4547, 9.1103] },
  { value: "Kaura", label: "Kaura (Games Village)", coordinates: [7.44561, 9.00316] },
  { value: "Kubwa", label: "Kubwa", coordinates: [7.34108, 9.15268] },
  { value: "Kuje", label: "Kuje", coordinates: [7.2272, 8.87963] },
  { value: "Kukwaba", label: "Kukwaba", coordinates: [7.44968, 9.03393] },
  { value: "Life Camp", label: "Life Camp", coordinates: [7.4103, 9.1002] },
  { value: "Lokogoma", label: "Lokogoma", coordinates: [7.47328, 8.9664] },
  { value: "Lugbe", label: "Lugbe", coordinates: [7.3667, 8.9833] },
  { value: "Mabushi", label: "Mabushi", coordinates: [7.44939, 9.08377] },
  { value: "Maitama", label: "Maitama", coordinates: [7.4951, 9.0921] },
  { value: "Mararaba", label: "Mararaba (Karu, Nasarawa)", coordinates: [7.59316, 9.02897] },
  { value: "Mpape", label: "Mpape", coordinates: [7.49211, 9.13024] },
  { value: "Nyanya", label: "Nyanya", coordinates: [7.56991, 9.02126] },
  { value: "Orozo", label: "Orozo", coordinates: [7.5708, 8.9] },
  { value: "Utako", label: "Utako", coordinates: [7.4394, 9.0687] },
  { value: "Wumba", label: "Wumba", coordinates: [7.48152, 8.96177] },
  { value: "Wuse", label: "Wuse", coordinates: [7.4833, 9.0632] },
  { value: "Wuye", label: "Wuye", coordinates: [7.4614, 9.0512] },
]);

export const PORT_HARCOURT_DISTRICTS: District[] = sorted([
  { value: "Abuloma", label: "Abuloma", coordinates: [7.03658, 4.77763] },
  { value: "Ada George", label: "Ada George", coordinates: [6.97653, 4.82838] },
  { value: "Alakahia", label: "Alakahia", coordinates: [6.92592, 4.88558] },
  { value: "Amadi-Ama", label: "Amadi-Ama", coordinates: [7.02727, 4.79978] },
  { value: "Borokiri", label: "Borokiri", coordinates: [7.03754, 4.74656] },
  { value: "Choba", label: "Choba", coordinates: [6.90399, 4.88725] },
  { value: "D-Line", label: "D-Line", coordinates: [7.00278, 4.80222] },
  { value: "Diobu", label: "Diobu (Mile 1–3)", coordinates: [7.00733, 4.79999] },
  { value: "Elekahia", label: "Elekahia", coordinates: [7.02119, 4.81431] },
  { value: "Elelenwo", label: "Elelenwo", coordinates: [7.06671, 4.84991] },
  { value: "Eliozu", label: "Eliozu", coordinates: [7.02316, 4.86338] },
  { value: "Eneka", label: "Eneka", coordinates: [7.03331, 4.89971] },
  { value: "Igwuruta", label: "Igwuruta", coordinates: [7.01267, 4.95437] },
  { value: "Iwofe", label: "Iwofe", coordinates: [6.95667, 4.81778] },
  { value: "Mgbuoba", label: "Mgbuoba", coordinates: [6.9692, 4.8421] },
  { value: "New GRA", label: "New GRA", coordinates: [7.00336, 4.82133] },
  { value: "Nkpogu", label: "Nkpogu", coordinates: [7.01788, 4.80573] },
  { value: "Ogbunabali", label: "Ogbunabali", coordinates: [7.00273, 4.821] },
  { value: "Oginigba", label: "Oginigba", coordinates: [7.0425, 4.82425] },
  { value: "Old GRA", label: "Old GRA", coordinates: [7.01167, 4.78139] },
  { value: "Oyigbo", label: "Oyigbo", coordinates: [7.13345, 4.88141] },
  { value: "Ozuoba", label: "Ozuoba", coordinates: [6.9334, 4.87134] },
  { value: "Peter Odili Road", label: "Peter Odili Road", coordinates: [7.04821, 4.80618] },
  { value: "Rumuepirikom", label: "Rumuepirikom", coordinates: [6.98135, 4.82953] },
  { value: "Rumueme", label: "Rumueme", coordinates: [6.982, 4.8259] },
  { value: "Rumuigbo", label: "Rumuigbo", coordinates: [6.99097, 4.851] },
  { value: "Rumuobiakani", label: "Rumuobiakani", coordinates: [7.0336, 4.8344] },
  { value: "Rumuodara", label: "Rumuodara", coordinates: [7.03238, 4.85374] },
  { value: "Rumuodomaya", label: "Rumuodomaya", coordinates: [6.99917, 4.87035] },
  { value: "Rumuogba", label: "Rumuogba", coordinates: [7.0404, 4.8427] },
  { value: "Rumuokoro", label: "Rumuokoro", coordinates: [6.997, 4.86684] },
  { value: "Rumuokwuta", label: "Rumuokwuta", coordinates: [6.98606, 4.84083] },
  { value: "Rumuola", label: "Rumuola", coordinates: [6.9952, 4.83383] },
  { value: "Rumuolumeni", label: "Rumuolumeni", coordinates: [6.9478, 4.8115] },
  { value: "Rumuomasi", label: "Rumuomasi", coordinates: [7.02663, 4.83125] },
  { value: "Rumuosi", label: "Rumuosi", coordinates: [6.94152, 4.87854] },
  { value: "Trans Amadi", label: "Trans Amadi", coordinates: [7.03722, 4.81472] },
  { value: "Woji", label: "Woji", coordinates: [6.99525, 4.81655] },
]);

export const WARRI_DISTRICTS: District[] = sorted([
  { value: "Agbassa", label: "Agbassa", coordinates: [5.75271, 5.5149] },
  { value: "Airport Road", label: "Airport Road", coordinates: [5.7591, 5.54223] },
  { value: "Ajamimogha", label: "Ajamimogha", coordinates: [5.73907, 5.52793] },
  { value: "Aladja", label: "Aladja", coordinates: [5.75513, 5.48599] },
  { value: "Bowen Avenue", label: "Bowen Avenue", coordinates: [5.75017, 5.51265] },
  { value: "Deco Road", label: "Deco Road", coordinates: [5.76306, 5.5245] },
  { value: "DSC", label: "DSC (Ovwian-Aladja)", coordinates: [5.77001, 5.481] },
  { value: "Edjeba", label: "Edjeba", coordinates: [5.7369, 5.5421] },
  { value: "Effurun", label: "Effurun", coordinates: [5.78501, 5.5555] },
  { value: "Egini", label: "Egini", coordinates: [5.7951, 5.5125] },
  { value: "Ekete", label: "Ekete", coordinates: [5.80312, 5.50636] },
  { value: "Ekpan", label: "Ekpan", coordinates: [5.7402, 5.56239] },
  { value: "Ekurede", label: "Ekurede", coordinates: [5.72966, 5.5259] },
  { value: "Enerhen", label: "Enerhen", coordinates: [5.78299, 5.54124] },
  { value: "Igbudu", label: "Igbudu", coordinates: [5.7726, 5.52525] },
  { value: "Ifie", label: "Ifie", coordinates: [5.6815, 5.55206] },
  { value: "Jakpa", label: "Jakpa Road", coordinates: [5.77255, 5.56161] },
  { value: "Jeddo", label: "Jeddo", coordinates: [5.70477, 5.59328] },
  { value: "Ogunu", label: "Ogunu", coordinates: [5.71119, 5.53543] },
  { value: "Okere", label: "Okere", coordinates: [5.74457, 5.52615] },
  { value: "Okumagba", label: "Okumagba Avenue", coordinates: [5.74284, 5.52989] },
  { value: "Okuokoko", label: "Okuokoko", coordinates: [5.80869, 5.58136] },
  { value: "Opete", label: "Opete", coordinates: [5.81165, 5.53593] },
  { value: "Orhuwhorun", label: "Orhuwhorun", coordinates: [5.8255, 5.50858] },
  { value: "Osubi", label: "Osubi", coordinates: [5.81944, 5.59722] },
  { value: "Otokutu", label: "Otokutu", coordinates: [5.83479, 5.54855] },
  { value: "Ovwian", label: "Ovwian", coordinates: [5.7897, 5.50716] },
  { value: "Pessu", label: "Pessu", coordinates: [5.75225, 5.50851] },
  { value: "PTI Road", label: "PTI Road", coordinates: [5.7976, 5.57467] },
  { value: "Refinery Road", label: "Refinery Road", coordinates: [5.77069, 5.56926] },
  { value: "Ubeji", label: "Ubeji", coordinates: [5.70232, 5.57181] },
  { value: "Ugbolokposo", label: "Ugbolokposo", coordinates: [5.81513, 5.56396] },
  { value: "Ugbomro", label: "Ugbomro", coordinates: [5.82945, 5.56483] },
  { value: "Ugborikoko", label: "Ugborikoko", coordinates: [5.76454, 5.53706] },
  { value: "Ugbuwangue", label: "Ugbuwangue", coordinates: [5.7221, 5.5211] },
  { value: "Uvwie", label: "Uvwie (Warri GRA)", coordinates: [5.76667, 5.55] },
]);

export const DISTRICTS_BY_STATE: Record<SupportedState, District[]> = {
  Abuja: ABUJA_DISTRICTS,
  "Port Harcourt": PORT_HARCOURT_DISTRICTS,
  Warri: WARRI_DISTRICTS,
};

export function findDistrict(state: string, city: string): District | undefined {
  return DISTRICTS_BY_STATE[state as SupportedState]?.find((d) => d.value === city);
}
