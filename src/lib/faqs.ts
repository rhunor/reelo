// Help-centre content, grouped by the same topics the contact form offers — picking a
// topic on /contact shows its FAQs first, so common questions get answered without a wait.

export interface FaqTopic {
  id: string;
  label: string;
  faqs: { q: string; a: string }[];
}

export const FAQ_TOPICS: FaqTopic[] = [
  {
    id: "renting",
    label: "Renting or buying a property",
    faqs: [
      {
        q: "How do I apply for a property?",
        a: "Open the listing and tap “Apply for this property” (or “Save for later” to come back to it). You need a verified identity (NIN or driver's licence) to apply. The landlord sees what you've chosen to share on your profile and accepts or declines — we notify you either way.",
      },
      {
        q: "What will I pay in total?",
        a: "Every listing shows a full breakdown before you pay: rent (or sale price), any caution fee and estate charge, plus Reallow's service charge — 10% of the annual rent for rentals, 5% of the price for sales. There are no other fees.",
      },
      {
        q: "Do I ever pay the landlord directly?",
        a: "No. Every payment goes into Reallow's account, and Reallow pays the landlord. Never send money to anyone outside Reallow for a property listed here.",
      },
      {
        q: "Can I contact the landlord (or applicant) directly?",
        a: "No — for everyone's safety, users never see each other's phone numbers or emails and can't message each other. Reallow arranges every inspection and meeting and is the only one who contacts you directly.",
      },
      {
        q: "Is the caution fee refundable?",
        a: "The caution fee is paid to the landlord together with the rent — Reallow doesn't hold it. Any refund at the end of your tenancy is between you and your landlord under your tenancy agreement.",
      },
    ],
  },
  {
    id: "inspections",
    label: "Inspections & meetings",
    faqs: [
      {
        q: "How do I book an inspection?",
        a: "Once the landlord accepts your application, open Meetings on your dashboard, choose “Book inspection”, pick a day on the calendar and a time. The landlord can accept, decline, or suggest another time.",
      },
      {
        q: "How much is an inspection?",
        a: "The inspection fee depends on the property's location and covers a Reallow agent attending with you. You pay it once the time is agreed — from your Reallow wallet or by card.",
      },
      {
        q: "What's the difference between an inspection and a meeting?",
        a: "An inspection is a paid visit to the property with a Reallow agent present. A meeting is a free appointment between you and the other side, arranged through Reallow.",
      },
      {
        q: "Something went wrong at my inspection — what do I do?",
        a: "After the date passes, open Meetings and tap “Rate this visit” to leave stars and a comment (e.g. the agent was late). Only Reallow sees it. For anything urgent, contact us directly.",
      },
    ],
  },
  {
    id: "listing",
    label: "Listing my property",
    faqs: [
      {
        q: "How do I list my property?",
        a: "From your dashboard choose “List a property”, fill in the details and full address, review the cost breakdown, and confirm. Listing is free.",
      },
      {
        q: "Why isn't my listing live yet?",
        a: "Every listing is verified in person before it goes live. A Reallow agent will call you to arrange a visit; you'll get a notification and email to confirm the time. Your own identity also needs to be verified.",
      },
      {
        q: "How much does the landlord or seller receive?",
        a: "You receive the full rent plus any caution fee and estate charge — or the full sale price. Reallow's service charge is paid on top by the tenant or buyer, not taken from your amount.",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments, wallet & refunds",
    faqs: [
      {
        q: "How does the Reallow wallet work?",
        a: "You can fund your wallet by card and use it for inspection fees and other payments — we always ask before paying from it. Referral earnings are also credited there once approved.",
      },
      {
        q: "How do I withdraw from my wallet?",
        a: "Open Wallet on your dashboard and request a withdrawal (minimum ₦3,000). Add your bank details in Settings first — the account name must match your verified identity.",
      },
      {
        q: "When does the landlord get paid?",
        a: "Reallow holds the payment and pays the landlord out after the tenancy or sale is completed and access to the property has been handed over.",
      },
    ],
  },
  {
    id: "account",
    label: "Account & verification",
    faqs: [
      {
        q: "Why do I need to verify my identity?",
        a: "Verifying your NIN or driver's licence keeps everyone on Reallow real. It's required to apply for a property, book an inspection, or get a listing published.",
      },
      {
        q: "How do I change my email, phone, or password?",
        a: "Open the profile menu, then Settings. Contact holds your email and phone numbers; Security is where you change your password.",
      },
      {
        q: "Who can see my profile details?",
        a: "Each profile detail has its own “Visible to others” switch, off by default. Your phone, email, address, date of birth, and bank details are never shown to other users.",
      },
    ],
  },
  {
    id: "referrals",
    label: "Referrals & earnings",
    faqs: [
      {
        q: "How do referrals work?",
        a: "Share your referral code (on your dashboard). When someone signs up with it and completes a deal on Reallow, you earn a percentage of the sale, credited to your wallet after Reallow approves it.",
      },
    ],
  },
  {
    id: "report",
    label: "Report a problem or a person",
    faqs: [
      {
        q: "How do I report a listing or a user?",
        a: "Use the “Report” link on the listing or profile. Reallow reviews every report. If you've been asked to pay outside Reallow, report it straight away.",
      },
    ],
  },
  { id: "other", label: "Something else", faqs: [] },
];

export function topicLabel(id?: string): string | undefined {
  return FAQ_TOPICS.find((t) => t.id === id)?.label;
}
