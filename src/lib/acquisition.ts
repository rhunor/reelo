// "How did you hear about us?" — asked at signup, reported in Admin → Insights to steer
// where Reallow spends on advertising.
export const HEARD_ABOUT_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "google", label: "Google search" },
  { value: "friend", label: "A friend or family member" },
  { value: "referral_code", label: "Someone's referral link or code" },
  { value: "reallow_agent", label: "A Reallow agent or staff member" },
  { value: "flyer", label: "Flyer, poster or billboard" },
  { value: "radio_tv", label: "Radio or TV" },
  { value: "event", label: "An event or campus outreach" },
  { value: "other", label: "Other" },
] as const;

export type HeardAboutSource = (typeof HEARD_ABOUT_OPTIONS)[number]["value"];

export function heardAboutLabel(value?: string): string {
  return HEARD_ABOUT_OPTIONS.find((o) => o.value === value)?.label ?? "Not answered";
}
