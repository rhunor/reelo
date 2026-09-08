export const metadata = { title: "Terms of Service — Reallow" };

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm text-clay">
        <strong>Draft — not legal advice.</strong> This is a placeholder Terms of Service written
        to describe how Reallow actually works today. Have a lawyer review and finalize this
        before relying on it.
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: draft, unreleased</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">1. What Reallow is</h2>
          <p className="mt-2">
            Reallow is a platform that connects tenants and landlords directly, without a
            traditional agent. Reallow verifies landlords and listings, coordinates all
            communication between tenants and landlords, and handles payments related to
            inspections, rent, deposits, and agency/legal fees as described in these Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">2. Accounts &amp; verification</h2>
          <p className="mt-2">
            You must provide accurate information when creating an account, including your legal
            name, contact details, National Identification Number (NIN), and Bank Verification
            Number (BVN). The name on your NIN, BVN, bank account, and profile must match. Reallow
            will not release any payment to a name that does not correspond with your verified
            identity.
          </p>
          <p className="mt-2">
            Tenants must complete NIN and BVN verification before applying for a listing or
            booking a paid inspection. Landlords must complete NIN and BVN verification before any
            property they list can be published.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">3. No direct contact</h2>
          <p className="mt-2">
            Landlords and tenants do not contact each other directly through Reallow. All
            inquiries, applications, inspection scheduling, and disputes are coordinated through
            Reallow staff.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">4. Payments</h2>
          <p className="mt-2">
            All payments made through Reallow — inspection fees, rent, caution fees, estate
            charges, agency fees, and legal fees — are paid into Reallow&apos;s own account, never
            directly into a landlord&apos;s account. Reallow pays landlords out separately, by bank
            transfer, once rent and deposit payments are confirmed.
          </p>
          <p className="mt-2">
            Caution fees are refundable and are held by Reallow, not the landlord, for the
            duration of the tenancy. A caution fee is refunded once both parties confirm the
            tenancy has ended and no damage is found, subject to Reallow&apos;s review.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">5. Listings</h2>
          <p className="mt-2">
            Every listing is subject to an in-person verification inspection by Reallow before it
            can be published. Reallow may reject or remove a listing at its discretion, including
            for suspected fraud, inaccurate information, or failed verification.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">6. Prohibited conduct</h2>
          <p className="mt-2">
            You may not use Reallow to list or seek properties outside the areas Reallow currently
            supports, misrepresent your identity, attempt to bypass Reallow to contact the other
            party directly, or use information obtained through the platform for any purpose
            unrelated to a genuine tenancy or sale.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">7. Liability</h2>
          <p className="mt-2">
            Reallow verifies listings and identities on a best-effort basis but does not guarantee
            the condition of any property or the conduct of any user. Reallow&apos;s liability is
            limited to the fees you have paid Reallow directly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">8. Changes</h2>
          <p className="mt-2">
            Reallow may update these Terms from time to time. Continued use of Reallow after a
            change means you accept the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">9. Contact</h2>
          <p className="mt-2">
            Questions about these Terms can be sent to Reallow through the in-app support flow.
          </p>
        </section>
      </div>
    </div>
  );
}
