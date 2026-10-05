// Quick-pick reasons on the meeting feedback form. Free-text comment covers anything else.
// What a customer can say about a visit. Field staff get their own list below — they rate
// how the landlord/applicant side went.
export const FEEDBACK_TAGS = [
  "Agent was late",
  "Agent was rude",
  "Agent didn't show up",
  "Other party was late",
  "Other party didn't show up",
  "Property didn't match the listing",
  "Agent was helpful",
  "Smooth and on time",
] as const;

export const STAFF_FEEDBACK_TAGS = [
  "Landlord was late",
  "Landlord didn't show up",
  "Applicant was late",
  "Applicant didn't show up",
  "Rude or aggressive behaviour",
  "Property hard to find",
  "Property not as listed",
  "Smooth visit",
] as const;

export const ALL_FEEDBACK_TAGS = [...FEEDBACK_TAGS, ...STAFF_FEEDBACK_TAGS] as const;
