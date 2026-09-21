export const metadata = { title: "Privacy Policy — Reallow" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: September 21, 2026</p>

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
            account details for payouts, optional profile details (occupation, employment status,
            marital status, religion, gender, state of origin, present address, profile picture),
            and records of your activity on Reallow (listings, applications, inspections,
            payments, messages to Reallow staff, reports you file or are named in).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Your contact details</h2>
          <p className="mt-2">
            Your email and phone number are used to reach you about the things you&apos;re actually
            doing on Reallow — confirming an inspection date, telling you a landlord approved your
            application, sending your tenancy agreement, or getting a message from Reallow
            support to you. Your phone number is also shared with the specific Reallow field agent
            assigned to a scheduled visit, so they can reach you or the other party to confirm
            logistics.
          </p>
          <p className="mt-2">
            If you keep the &quot;Keep me updated about Reallow&quot; option on at signup, that
            means you&apos;ve subscribed to occasional emails about new features, listings, or
            promotions — separate from the transactional emails above, and something you can turn
            off at any time without affecting your account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Why we ask about occupation, employment, marital status, religion, gender, and state of origin</h2>
          <p className="mt-2">
            None of this is a screening questionnaire Reallow imposes on you, and none of it
            affects whether you can use Reallow. It exists for two reasons: some landlords ask
            for this kind of background context when reviewing an application, and you can choose
            to share any of it (each field has its own visibility switch, off by default); and
            Reallow uses it internally to serve you better — for example, matching you with
            listings and other users more relevant to your circumstances. Nothing here is ever
            used to determine your eligibility to use the Platform itself.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Your account balance</h2>
          <p className="mt-2">
            If you refer people to Reallow, you may earn a percentage of sales completed using
            your referral code, credited to a balance on your Reallow account. Reallow holds that
            balance until you request a withdrawal, which Reallow then pays out to the bank
            details on your profile by bank transfer. Separately, if you&apos;re a tenant, your
            caution fee is held by Reallow — not the landlord — for the duration of your tenancy,
            and refunded once both parties confirm the tenancy has ended with no damage found.
            Both of these are custodial: Reallow is holding money on your behalf, not spending it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">How we use it</h2>
          <p className="mt-2">
            To verify your identity before you can apply for, or pay for, anything on Reallow, or
            have a listing you&apos;ve posted published; to confirm your name matches before any
            payout; to route your inquiries to Reallow staff; to prevent the same person from
            operating more than one account; and to show other users only the information
            you&apos;ve explicitly chosen to make visible.
          </p>
          <p className="mt-2">
            Your NIN, BVN, bank account details, and present address are never shown to any other
            user, regardless of your visibility settings — those settings only apply to optional
            profile details like occupation, marital status, religion, employment status, gender,
            state of origin, and your profile picture.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Who can see what</h2>
          <p className="mt-2">
            Your verification status (verified/not verified) is always visible to whoever you&apos;re
            dealing with through Reallow, since it&apos;s a trust signal. Optional profile details
            are visible to others only if you turn on that specific field&apos;s visibility. Reallow
            staff can see your full profile and verification data in order to operate the
            platform, coordinate transactions, and investigate disputes, reports, or suspected
            fraud. Whether an account was brought onto Reallow through a referral, and by whom, is
            visible only to Reallow staff.
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
            out of marketing emails at any time, separately from the transactional emails Reallow
            needs to send you to operate your account. You can contact Reallow to ask what data we
            hold about you.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about this policy can be sent to Reallow through the in-app support flow, or
            via the <a href="/contact" className="underline">Contact</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
