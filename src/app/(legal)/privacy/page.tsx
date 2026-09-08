export const metadata = { title: "Privacy Policy — Reallow" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: September 8, 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            We take your privacy seriously
          </h2>
          <p className="mt-2">
            Reallow collects sensitive information — including your National Identification
            Number (NIN), Bank Verification Number (BVN), and bank account details — because real
            money moves through the platform and Reallow must be able to confirm who it&apos;s
            paying. This information is never sold, and is never shown to other users.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">What we collect</h2>
          <p className="mt-2">
            Account details (name, email, phone), identity verification data (NIN, BVN), bank
            account details for payouts, optional profile details (occupation, marital status,
            religion, profile picture), and records of your activity on Reallow (listings,
            applications, inspections, payments, messages to Reallow staff).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">How we use it</h2>
          <p className="mt-2">
            To verify your identity before you can list, apply for, or pay for anything on
            Reallow; to confirm your name matches before any payout; to route your inquiries to
            Reallow staff; and to show other users only the information you&apos;ve explicitly
            chosen to make visible.
          </p>
          <p className="mt-2">
            Your NIN, BVN, and bank account details are never shown to any other user, regardless
            of your visibility settings — those settings only apply to optional profile details
            like occupation, marital status, religion, and your profile picture.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Who can see what</h2>
          <p className="mt-2">
            Your verification status (verified/not verified) is always visible to whoever you&apos;re
            dealing with through Reallow, since it&apos;s a trust signal. Optional profile details
            are visible to others only if you turn on that specific field&apos;s visibility. Reallow
            staff can see your full profile and verification data in order to operate the
            platform, coordinate transactions, and investigate disputes or suspected fraud.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Third parties</h2>
          <p className="mt-2">
            We share identity data with Youverify (identity verification), payment data with
            Paystack (payments), and photos/videos with Cloudinary (media hosting) — solely to
            provide those specific services, not for their own marketing use.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Your choices</h2>
          <p className="mt-2">
            You can turn off visibility for any optional profile field at any time. You can opt
            out of marketing emails at any time. You can contact Reallow to ask what data we hold
            about you.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about this policy can be sent to Reallow through the in-app support flow.
          </p>
        </section>
      </div>
    </div>
  );
}
