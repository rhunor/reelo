import type { MessageKey } from "@/lib/i18n/dictionaries";

// Help-centre content, grouped by the same topics the contact form offers — picking a
// topic on /contact shows its FAQs first, so common questions get answered without a wait.
// The words live in the translation files: faqTopic.<id>, faq.<faqId>.q and faq.<faqId>.a.

export interface FaqTopicDef {
  id: string;
  faqIds: string[];
}

export const FAQ_TOPICS: FaqTopicDef[] = [
  { id: "renting", faqIds: ["renting1", "renting2", "renting3", "renting4", "renting5"] },
  { id: "inspections", faqIds: ["inspections1", "inspections2", "inspections3", "inspections4"] },
  { id: "listing", faqIds: ["listing1", "listing2", "listing3"] },
  { id: "payments", faqIds: ["payments1", "payments2", "payments3"] },
  { id: "account", faqIds: ["account1", "account2", "account3"] },
  { id: "referrals", faqIds: ["referrals1"] },
  { id: "report", faqIds: ["report1"] },
  { id: "other", faqIds: [] },
];

export interface FaqTopic {
  id: string;
  label: string;
  faqs: { id: string; q: string; a: string }[];
}

type T = (key: MessageKey) => string;

export function translatedTopics(t: T): FaqTopic[] {
  return FAQ_TOPICS.map((topic) => ({
    id: topic.id,
    label: t(`faqTopic.${topic.id}` as MessageKey),
    faqs: topic.faqIds.map((id) => ({
      id,
      q: t(`faq.${id}.q` as MessageKey),
      a: t(`faq.${id}.a` as MessageKey),
    })),
  }));
}

// English topic name, for emails to Reallow's inbox.
const ENGLISH_TOPIC: Record<string, string> = {
  renting: "Renting or buying a property",
  inspections: "Inspections & meetings",
  listing: "Listing my property",
  payments: "Payments, wallet & refunds",
  account: "Account & verification",
  referrals: "Referrals & earnings",
  report: "Report a problem or a person",
  other: "Something else",
};

export function topicLabel(id?: string): string | undefined {
  return id ? ENGLISH_TOPIC[id] : undefined;
}
