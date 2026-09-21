// What a new user says they're using Reallow for, collected at signup instead of a blunt
// "I'm a tenant / I'm a landlord" toggle (feedback: "tenant sounds degrading"). This is
// multi-select and purely for personalization/copy — it does NOT replace `User.role`,
// which every dashboard/API permission check in the app keys off. `deriveRoleFromIntents`
// is the one place that turns a set of intents into the actual account type, so the
// client form and the server route can never disagree about how an intent maps to a role.
export type Intent = "renting_out" | "selling" | "renting" | "buying" | "prefer_not_to_say";

export const INTENTS: { value: Intent; label: string }[] = [
  { value: "renting_out", label: "Looking to rent out a property" },
  { value: "selling", label: "Looking to sell a property" },
  { value: "renting", label: "Looking to rent a property" },
  { value: "buying", label: "Looking to buy a property" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const OWNER_SIDE: Intent[] = ["renting_out", "selling"];
const SEEKER_SIDE: Intent[] = ["renting", "buying"];

export function deriveRoleFromIntents(intents: Intent[]): "landlord" | "tenant" {
  if (intents.some((intent) => OWNER_SIDE.includes(intent))) return "landlord";
  if (intents.some((intent) => SEEKER_SIDE.includes(intent))) return "tenant";
  return "tenant";
}
