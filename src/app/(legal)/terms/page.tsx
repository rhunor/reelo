import type { ReactNode } from "react";
import { SUPPORT_EMAIL, SUPPORT_PHONES } from "@/lib/contact-info";

export const metadata = { title: "Terms of Use — Reallow" };

// Reallow Terms of Use (version supplied 10 October 2026). The company's full legal name is
// shown as "Reallow" until the registered name is confirmed — update COMPANY_NAME then.
const COMPANY_NAME = "Reallow";
const EFFECTIVE = "October 17, 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Numbered({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-[lower-roman] space-y-1 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-foreground/50">
        Effective date: {EFFECTIVE} · Last updated: {EFFECTIVE}
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <Section title="1. Agreement to Terms">
          <p>
            These Terms of Use (&ldquo;Terms&rdquo;) govern access to and use of the Reallow website, mobile application
            and related services (collectively, the &ldquo;Platform&rdquo;), operated by {COMPANY_NAME} (&ldquo;Reallow&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;).
          </p>
          <p>
            By creating an account, accessing the Platform, submitting a property listing, applying for a property,
            booking an inspection or making a payment through the Platform, you acknowledge that you have read,
            understood and agreed to these Terms and any applicable policies incorporated into them.
          </p>
          <p>If you do not agree to these Terms, you must not use the Platform.</p>
          <p>
            Reallow provides a technology-enabled platform designed to connect property owners, persons authorised to
            manage or let properties, and prospective tenants or purchasers. Reallow coordinates listings, identity and
            property verification processes, enquiries, inspections, negotiations, documentation and payments in
            accordance with the services offered on the Platform.
          </p>
          <p>
            <strong className="text-foreground">
              Reallow is an independent third-party platform and is not the owner, landlord, tenant, purchaser or seller
              of a listed property merely by facilitating a transaction.
            </strong>{" "}
            Unless expressly agreed in a separate written contract, Reallow does not guarantee the performance of either
            party&apos;s obligations under a tenancy or sale transaction.
          </p>
        </Section>

        <Section title="2. Definitions">
          <p>For the purposes of these Terms:</p>
          <Bullets
            items={[
              <><strong className="text-foreground">&ldquo;User&rdquo;</strong> means any person who accesses or uses the Platform.</>,
              <><strong className="text-foreground">&ldquo;Property Owner&rdquo;</strong> means a person claiming ownership of, or a legally recognised interest in, a property listed on the Platform.</>,
              <><strong className="text-foreground">&ldquo;Property Representative&rdquo;</strong> means a person authorised to manage, market, lease or otherwise act in respect of a property.</>,
              <><strong className="text-foreground">&ldquo;Applicant&rdquo;</strong> means a person applying to rent, purchase or otherwise occupy a listed property.</>,
              <><strong className="text-foreground">&ldquo;Transaction&rdquo;</strong> means a proposed or completed tenancy, purchase, sale or other property arrangement facilitated through Reallow.</>,
              <><strong className="text-foreground">&ldquo;Verification&rdquo;</strong> means the identity checks, document reviews, property inspections and other checks Reallow elects to conduct in connection with an account or listing.</>,
              <><strong className="text-foreground">&ldquo;Handover&rdquo;</strong> means the transfer of possession, access or control of a property following a completed transaction, as applicable.</>,
            ]}
          />
        </Section>

        <Section title="3. Eligibility and Account Registration">
          <p>
            To use the Platform, you must be at least eighteen (18) years old, possess the legal capacity to enter into
            binding contracts under applicable Nigerian law and provide genuine identification acceptable to Reallow.
          </p>
          <p>You agree to:</p>
          <Bullets
            items={[
              "Provide accurate, complete and current registration information.",
              "Submit genuine identity documents belonging to you.",
              "Ensure that all information and documents supplied are authentic and not misleading.",
              "Keep your account details updated and maintain the confidentiality of your login credentials.",
              "Notify Reallow promptly of suspected unauthorised access or fraudulent activity involving your account.",
              "Cooperate with reasonable identity, fraud prevention and transaction verification requests.",
            ]}
          />
          <p>
            Reallow may require a valid National Identification Number (NIN), driver&apos;s licence or other legally
            acceptable identification, subject to applicable data protection requirements.
          </p>
          <p>
            The name associated with your verified identity, profile and designated bank account must correspond, subject
            to any alternative verification arrangements expressly approved by Reallow and permitted by law.
          </p>
          <p>
            Each identity document, telephone number or email address may be linked to only one account unless Reallow
            expressly permits otherwise.
          </p>
          <p>
            Reallow may refuse registration, request additional documentation, restrict account functionality or suspend
            an account where identity cannot be satisfactorily verified, information is inconsistent or fraud is
            reasonably suspected.
          </p>
          <p>
            You remain responsible for activities carried out through your account, except to the extent that applicable
            law provides otherwise or the activity results from a matter for which Reallow is legally responsible.
          </p>
        </Section>

        <Section title="4. Property Listings and Owner Responsibilities">
          <p>A User may initiate a property listing without charge, subject to the Platform&apos;s applicable requirements.</p>
          <p>
            A listing will not become publicly available until Reallow has completed its required verification process
            and approved publication.
          </p>
          <p>Every person submitting a listing represents and warrants that:</p>
          <Bullets
            items={[
              "They own the property or possess sufficient legal authority to list and transact in respect of it.",
              "All information supplied, including the property's location, condition, rent, sale price, title information and availability, is accurate and not misleading.",
              "All documents submitted are genuine, current and lawfully obtained.",
              "They have disclosed any material restriction, encumbrance, competing interest or circumstance known to them that may affect the proposed transaction.",
              "They will promptly notify Reallow of any material change affecting the property or their authority to transact.",
            ]}
          />
          <p>
            A Property Representative must provide evidence of their authority where requested. Reallow may require
            confirmation directly from the property owner or other supporting documentation.
          </p>
          <p>
            A listing owner must not list a property without the owner&apos;s consent or other lawful authority,
            impersonate an owner, submit forged documents, conceal material facts or advertise a property that is
            unavailable for the stated purpose.
          </p>
          <p>
            Reallow may reject, suspend, amend or remove a listing where verification fails, information appears
            inaccurate, a complaint is received, legal compliance requires it or Reallow reasonably considers the listing
            to present a fraud, safety or transaction risk.
          </p>
          <p>Publication of a listing does not constitute an endorsement of the owner, the property or the proposed transaction.</p>
        </Section>

        <Section title="5. Identity and Property Title Verification">
          <p>
            Reallow shall use reasonable, good-faith efforts, consistent with the verification process it offers, to
            verify the identity of Users and examine documents and information provided in support of property listings.
          </p>
          <p>
            Such efforts may include reviewing identification documents, examining ownership or title documents,
            conducting physical inspections, seeking confirmation from the purported owner, reviewing available records
            and requesting additional evidence where appropriate.
          </p>
          <p>
            <strong className="text-foreground">Verification is a risk-reduction measure, not an absolute guarantee.</strong>
          </p>
          <p>Users expressly acknowledge that:</p>
          <Bullets
            items={[
              "Reallow is a third-party platform and does not become the legal owner or guarantor of a property by verifying or publishing its listing.",
              "Reallow's review of title documents does not constitute a legal certification that the title is valid, indefeasible, unencumbered or enforceable against all third parties.",
              "A physical inspection does not establish ownership, legal title, structural integrity, regulatory approval, planning compliance or the absence of hidden defects.",
              "Identity checks cannot guarantee that an individual is acting honestly, has disclosed every relevant fact or will not subsequently engage in fraud.",
              "Documents may be forged, incomplete, outdated, inaccurate or affected by interests that are not reasonably discoverable through the checks undertaken.",
              "Public records and third-party verification services may be incomplete, inaccessible, delayed or inaccurate.",
              "Reallow may be unable to discover competing claims, undisclosed encumbrances, fraud, litigation, family interests, adverse possession or other defects affecting a property.",
            ]}
          />
          <p>
            Users are encouraged to obtain independent legal advice and, where appropriate, conduct searches at the
            relevant land registry, obtain surveyor&apos;s reports, verify planning approvals and investigate any other
            matters material to their proposed transaction.
          </p>
          <p>
            Where the nature or value of a transaction warrants it, an Applicant should independently confirm the
            identity and authority of the person offering the property before making an irreversible commitment.
          </p>
          <p>
            Reallow does not undertake to conduct every possible search or investigation in respect of every property.
            The scope of verification may vary depending on the property, location, available records, risk indicators
            and the verification service applicable to the listing.
          </p>
          <p>
            <strong className="text-foreground">
              Nothing in this clause excludes or limits liability that cannot lawfully be excluded or limits any duty of
              care that Reallow is legally required to perform.
            </strong>
          </p>
        </Section>

        <Section title="6. Role and Responsibilities of Reallow">
          <p>Reallow&apos;s role is limited to the platform and facilitation services expressly offered.</p>
          <p>Depending on the Transaction, these services may include:</p>
          <Numbered
            items={[
              "Facilitating account and listing verification.",
              "Publishing approved listings.",
              "Receiving and coordinating enquiries and applications.",
              "Scheduling and coordinating inspections.",
              "Facilitating communications and negotiations.",
              "Preparing or facilitating the preparation of tenancy documentation.",
              "Collecting and processing payments through the payment arrangements displayed on the Platform.",
              "Communicating transaction updates and facilitating handover.",
            ]}
          />
          <p>Unless expressly agreed otherwise in writing, Reallow does not independently guarantee:</p>
          <Bullets
            items={[
              "That a User will honour a promise, representation or contractual obligation.",
              "That a property will remain available until a proposed transaction is completed.",
              "That a landlord or seller has disclosed every defect, dispute, restriction or competing interest.",
              "That a tenant or purchaser will pay all amounts when due or comply with the tenancy or sale agreement.",
              "That a property is suitable for a particular purpose or free from physical, environmental or legal defects.",
              "That a transaction will be completed within a particular timeframe.",
              "That a User will remain honest, solvent, contactable or cooperative after a transaction.",
            ]}
          />
          <p>
            Reallow will act in good faith in performing its stated services and will exercise such care as is required
            by applicable law. Its role as an intermediary does not relieve it of its own contractual or statutory
            obligations.
          </p>
          <p>
            Reallow is not a party to the tenancy or sale agreement merely because it facilitates the transaction. The
            substantive rights and obligations of the landlord, tenant, seller and purchaser shall be governed by their
            applicable agreement and the law.
          </p>
        </Section>

        <Section title="7. Inspections, Applications and Negotiations">
          <p>
            Users must complete any required identity verification before applying for a property or booking a paid
            physical inspection.
          </p>
          <p>
            Inspection appointments are subject to availability, access permissions, security considerations and
            cooperation from the relevant property representative.
          </p>
          <p>
            Reallow may reschedule or cancel an inspection where access is unavailable, information is disputed, a safety
            concern arises or circumstances beyond its reasonable control prevent the inspection.
          </p>
          <p>
            An inspection does not constitute an independent structural survey, valuation, legal title search or
            professional assessment unless such a service is expressly stated and separately agreed.
          </p>
          <p>
            Applicants must personally assess whether the property meets their requirements and may request further
            information or professional advice before committing to a Transaction.
          </p>
          <p>Reallow does not guarantee that an application will be accepted or that a proposed negotiation will result in an agreement.</p>
          <p>
            Users must not misrepresent their financial capacity, identity, authority, intended use of a property or other
            material information relevant to a Transaction.
          </p>
        </Section>

        <Section title="8. No Direct Contact Before Completion">
          <p>
            Until the relevant Transaction is completed and handover has occurred, all enquiries, applications,
            inspections, negotiations, documentation and payments must be coordinated through Reallow&apos;s designated
            channels, subject to applicable law and any communication method expressly authorised by Reallow.
          </p>
          <p>
            Users must not circumvent Reallow to avoid applicable service charges, misappropriate information obtained
            through the Platform or induce another User to complete a transaction outside the agreed process.
          </p>
          <p>
            This restriction does not prevent communications reasonably necessary for personal safety, compliance with
            law, obtaining independent legal advice or reporting suspected fraud or misconduct.
          </p>
          <p>
            Following completion and handover, the parties may communicate directly regarding matters arising from their
            tenancy, ownership or sale, including repairs, renewals, utilities, deposits, maintenance and disputes.
          </p>
          <p>
            Unless a separate written agreement expressly provides otherwise, Reallow is not responsible for managing the
            property or administering the relationship between the parties after handover.
          </p>
          <p>
            This provision does not exclude responsibility for any outstanding obligation that Reallow has expressly
            undertaken or that applicable law imposes on it.
          </p>
        </Section>

        <Section title="9. Payments, Service Charges and Refunds">
          <p>
            All amounts payable through the Platform must be paid using the payment methods and designated accounts
            displayed or communicated through Reallow&apos;s authorised channels.
          </p>
          <p>
            Users must not make payments to an individual account or third party claiming to represent Reallow unless the
            payment arrangement has been expressly authorised by Reallow and verified through its official channels.
          </p>
          <p>
            Reallow may collect inspection fees, rent, caution fees, estate charges and its service charge in accordance
            with the transaction breakdown disclosed before payment.
          </p>
          <p>
            <strong className="text-foreground">
              Reallow&apos;s service charge is ordinarily ten per cent (10%) of the annual rent for a tenancy and five per
              cent (5%) of the sale price for a property sale, unless a different charge is expressly disclosed and
              accepted before the relevant Transaction.
            </strong>
          </p>
          <p>
            Reallow will prepare the tenancy agreement without a separate drafting charge where this service is included
            in the applicable transaction package. Third-party professional services or other separately disclosed
            expenses may attract additional charges.
          </p>
          <p>
            Fees may be revised prospectively. A fee already disclosed and accepted for a particular Transaction will not
            be changed retrospectively without the User&apos;s agreement or another lawful basis.
          </p>
          <p>
            Where Reallow receives transaction funds for onward payment, the applicable payment arrangement, deductions,
            release conditions and expected processing timeframe shall be disclosed to the relevant parties. Reallow may
            conduct reasonable checks to confirm payment, identity, authority and compliance before releasing funds.
          </p>
          <p>
            Reallow shall not be responsible for a delay caused solely by a bank, payment processor, regulatory
            requirement or other third party outside its reasonable control, provided that Reallow acts as required by law
            and takes reasonable steps to address the delay.
          </p>
          <h3 className="mt-2 font-semibold text-foreground">Caution fees</h3>
          <p>
            For a tenancy, the caution fee shall be collected and transferred to the landlord or other designated
            recipient in accordance with the disclosed transaction terms. Unless expressly stated otherwise in a separate
            written agreement, Reallow does not retain the caution fee as a deposit for future return.
          </p>
          <p>
            The conditions for refunding or deducting from the caution fee, including any deductions for damage or unpaid
            obligations, must be determined under the tenancy agreement and applicable law.
          </p>
          <p>
            Reallow is not responsible for a landlord&apos;s failure to refund a caution fee after it has been properly
            transferred, except to the extent that Reallow has expressly undertaken an additional obligation or is
            otherwise legally responsible.
          </p>
          <h3 className="mt-2 font-semibold text-foreground">Refunds and failed transactions</h3>
          <p>Refunds shall be processed in accordance with the applicable transaction terms, the disclosed cancellation policy and applicable law.</p>
          <p>A User may be required to provide proof of payment, identity verification and relevant transaction details before a refund is processed.</p>
          <p>
            Where a Transaction fails before completion, Reallow shall assess the amounts received, services already
            rendered, applicable disclosed fees and the reason for failure in determining the appropriate refund.
          </p>
          <p>
            Once the agreed transaction conditions have been satisfied, payment has been made and handover completed, the
            Transaction will ordinarily be regarded as completed for Platform administration purposes. Subsequent
            obligations between the parties remain governed by their agreement and applicable law.
          </p>
          <p>Reallow does not guarantee recovery of funds transferred directly to another User outside its authorised payment arrangements.</p>
        </Section>

        <Section title="10. Property Transactions and Independent Due Diligence">
          <p>Each User is responsible for making an informed decision before entering into a tenancy, purchase, sale or other property arrangement.</p>
          <p>
            Before committing to a Transaction, Users should independently review the material terms, confirm the
            identity and authority of the relevant parties, inspect the property, consider its condition and seek
            professional advice where appropriate.
          </p>
          <p>
            Property Owners and Property Representatives remain responsible for the legality of their authority to
            transact, the accuracy of their representations, the condition of the property and compliance with
            applicable laws.
          </p>
          <p>
            Applicants remain responsible for assessing affordability, suitability, intended use and their ability to
            comply with the proposed agreement.
          </p>
          <p>
            Reallow&apos;s provision of a draft tenancy agreement or other transaction documentation does not, by itself,
            constitute legal representation of either party or a guarantee that the document addresses every
            circumstance particular to the Transaction. Users may obtain independent legal advice before signing.
          </p>
          <p>Nothing in this clause excludes any responsibility Reallow has expressly accepted under a separate agreement.</p>
        </Section>

        <Section title="11. Disputes, Complaints and Fraud Reporting">
          <p>
            Users are encouraged to report suspected fraud, false listings, unauthorised account activity, payment
            discrepancies, misrepresentation or misconduct through the Platform&apos;s reporting or support channels.
          </p>
          <p>
            Reallow may request supporting evidence, communicate with the parties, investigate available records, suspend
            a disputed listing, restrict an account or take other reasonable steps to protect Users and the integrity of
            the Platform.
          </p>
          <p>
            Unless required by law or expressly agreed in writing, Reallow does not guarantee a particular outcome in a
            dispute between Users and is not required to compensate a User solely because another User has defaulted.
          </p>
          <p>Reallow may preserve relevant records and cooperate with lawful requests from courts, law enforcement agencies and regulatory authorities.</p>
          <p>
            Nothing in this clause prevents a User from exercising any legal right, making a complaint to a competent
            regulator or seeking relief from a court of competent jurisdiction.
          </p>
        </Section>

        <Section title="12. Prohibited Conduct">
          <p>Users must not:</p>
          <Numbered
            items={[
              "Create multiple accounts in breach of these Terms or use another person's identity documents without lawful authority.",
              "Submit forged, altered, misleading or unlawfully obtained documents.",
              "List or apply for properties outside the areas currently supported by Reallow.",
              "Misrepresent ownership, authority, property condition, availability, price or other material information.",
              "Request or make unauthorised payments outside the approved transaction process to evade fees or commit fraud.",
              "Circumvent the Platform's transaction process for an improper purpose.",
              "Harass, threaten, discriminate unlawfully against or intimidate another User.",
              "Upload malicious software, interfere with Platform security or attempt unauthorised access to accounts or systems.",
              "Scrape, copy, sell or misuse personal information or listing information for purposes unrelated to a legitimate property transaction.",
              "Use the Platform for money laundering, fraud, unlawful discrimination or any other unlawful activity.",
            ]}
          />
          <p>
            Users must comply with all applicable laws and must not use the Platform in a manner that exposes Reallow or
            another User to an unreasonable legal, financial, privacy or security risk.
          </p>
        </Section>

        <Section title="13. Suspension, Removal and Termination">
          <p>
            Reallow may suspend or restrict an account, remove a listing, pause a payment or decline a Transaction where
            reasonably necessary to investigate suspected fraud, verify information, comply with law, address a security
            concern or prevent material harm.
          </p>
          <p>
            Where practicable and lawful, Reallow may provide the affected User with an explanation and an opportunity to
            respond. Prior notice may not be appropriate where urgent action is reasonably required to prevent fraud,
            protect personal information or comply with a lawful direction.
          </p>
          <p>
            Reallow may retain information where required or permitted by law, including information necessary to resolve
            disputes, establish legal claims, prevent fraud or comply with regulatory requirements.
          </p>
        </Section>

        <Section title="14. Privacy and Protection of Personal Data">
          <p>
            Reallow will process personal data in accordance with the Nigeria Data Protection Act 2023, applicable data
            protection regulations and other relevant laws.
          </p>
          <h3 className="mt-2 font-semibold text-foreground">Personal data collected</h3>
          <p>Depending on how the Platform is used, Reallow may collect:</p>
          <Numbered
            items={[
              "Names, contact details, date of birth and identity verification information.",
              "NIN or other identification details where lawfully required.",
              "Profile photographs, identity documents and verification results.",
              "Property details, ownership documents and evidence of authority to transact.",
              "Applications, inspection records, communications and transaction history.",
              "Payment confirmations, bank account details and relevant financial records.",
              "Device, technical, security and Platform usage information.",
              "Complaints, reports and information reasonably necessary to investigate fraud or disputes.",
            ]}
          />
          <p>Reallow shall seek to collect only information reasonably necessary for specified and legitimate purposes, subject to applicable law.</p>
          <h3 className="mt-2 font-semibold text-foreground">Purposes and lawful basis</h3>
          <p>Personal data may be processed, as applicable, to:</p>
          <Numbered
            items={[
              "Create and manage accounts.",
              "Verify identities and assess property listings.",
              "Facilitate inspections, applications, negotiations and Transactions.",
              "Process payments, refunds and transaction records.",
              "Prevent, detect and investigate fraud, impersonation and unauthorised activity.",
              "Respond to complaints and resolve disputes.",
              "Meet legal, regulatory, accounting and record-keeping obligations.",
              "Maintain Platform security, improve services and communicate material updates.",
            ]}
          />
          <p>
            Processing will be based on an applicable lawful basis, which may include performance of a contract,
            compliance with a legal obligation, legitimate interests assessed against the rights of affected individuals,
            consent where required, or another lawful basis under applicable law.
          </p>
          <p>
            Where consent is relied upon, it shall be obtained and managed in accordance with applicable law. Consent will
            not be treated as a substitute for another lawful basis where consent is not appropriate.
          </p>
          <h3 className="mt-2 font-semibold text-foreground">Sharing and disclosure</h3>
          <p>
            Reallow may share relevant personal data with identity verification providers, property verification
            personnel, payment processors, banks, technology service providers, professional advisers, insurers, law
            enforcement agencies, courts and regulatory authorities where necessary and lawful.
          </p>
          <p>
            Information may also be disclosed to another User to the extent reasonably necessary to facilitate a proposed
            Transaction, subject to appropriate safeguards and the Platform&apos;s privacy notices.
          </p>
          <p>Reallow shall not sell personal data in violation of applicable law or disclose it for unrelated purposes without an appropriate lawful basis.</p>
          <p>
            Third-party service providers receiving personal data must be subject to appropriate contractual,
            confidentiality and security obligations where required by law.
          </p>
        </Section>

        <Section title="15. Intellectual Property and User Content">
          <p>
            The Platform&apos;s software, design, branding, text, graphics and other materials owned by Reallow are
            protected by applicable intellectual property laws.
          </p>
          <p>
            Subject to these Terms, Reallow grants Users a limited, revocable, non-exclusive and non-transferable right to
            use the Platform for its intended purposes.
          </p>
          <p>
            Users retain ownership of content they lawfully upload, including property photographs, videos and
            descriptions. By uploading such content, a User grants Reallow a non-exclusive, royalty-free licence to host,
            reproduce, display, adapt for technical presentation and distribute that content as reasonably necessary to
            operate, verify and market the relevant listing through the Platform.
          </p>
          <p>
            Users warrant that they have the necessary rights and permissions to upload such content and that its use by
            Reallow for the stated purposes will not unlawfully infringe another person&apos;s rights.
          </p>
          <p>Reallow may remove content that infringes intellectual property rights, violates these Terms or creates a legal or security risk.</p>
        </Section>

        <Section title="16. Platform Availability and Third-Party Services">
          <p>
            Reallow will use reasonable efforts to maintain the availability and security of the Platform but does not
            guarantee uninterrupted, error-free or continuous access.
          </p>
          <p>
            The Platform may be affected by maintenance, telecommunications failures, power outages, cyber incidents,
            third-party service interruptions or other circumstances beyond Reallow&apos;s reasonable control.
          </p>
          <p>Reallow may update, modify, suspend or discontinue features where reasonably necessary for operational, security, legal or commercial reasons.</p>
          <p>
            Where the Platform relies on third-party services, their availability and performance may be outside
            Reallow&apos;s direct control. Reallow remains responsible for obligations imposed on it by applicable law and
            for any express commitments it has made regarding those services.
          </p>
        </Section>

        <Section title="17. Disclaimers and Limitation of Liability">
          <p>
            The Platform is provided on an &ldquo;as available&rdquo; basis, subject to the services expressly offered and
            the obligations imposed on Reallow by applicable law.
          </p>
          <p>To the maximum extent permitted by law, Reallow shall not be liable for losses arising solely from:</p>
          <Bullets
            items={[
              "A User's fraudulent conduct, false representations or breach of their obligations.",
              "A defect in property title or a competing ownership claim that was not reasonably discoverable through the verification undertaken.",
              "Hidden defects, structural problems or conditions not identified during the applicable inspection.",
              "A landlord's, tenant's, seller's or purchaser's independent failure to perform their contractual obligations.",
              "Unauthorised dealings or payments made outside Reallow's approved processes.",
              "Third-party service interruptions or other events beyond Reallow's reasonable control.",
            ]}
          />
          <p>
            This allocation of risk reflects the fact that Reallow facilitates transactions between independent parties
            and does not itself guarantee their conduct or the legal status or condition of every listed property.
          </p>
          <p>
            To the maximum extent permitted by applicable law, Reallow shall not be liable for indirect or consequential
            losses that are not reasonably foreseeable or otherwise recoverable under applicable law.
          </p>
          <p>
            <strong className="text-foreground">
              Nothing in these Terms excludes or limits liability for fraud, fraudulent misrepresentation, wilful
              misconduct, negligence or breach of duty to the extent such exclusion or limitation is prohibited by law.
            </strong>{" "}
            Nothing in these Terms limits a consumer&apos;s statutory rights or any other liability that cannot lawfully
            be excluded or restricted.
          </p>
          <p>
            Subject to the foregoing, where a monetary limitation of liability is legally permissible, Reallow&apos;s
            aggregate liability arising directly from a particular Transaction shall not exceed the service charges
            actually paid to Reallow in respect of that Transaction during the twelve (12) months preceding the event
            giving rise to the claim.
          </p>
          <p>
            This monetary cap shall apply only to the extent enforceable under applicable law and shall not apply to
            liabilities that cannot lawfully be capped or excluded.
          </p>
        </Section>

        <Section title="18. Indemnification">
          <p>
            To the extent permitted by applicable law, a User shall be responsible for losses, reasonable legal expenses,
            claims and liabilities incurred by Reallow to the extent directly arising from:
          </p>
          <Numbered
            items={[
              "The User's fraud, wilful misconduct or unlawful activity.",
              "The User's material breach of these Terms.",
              "False, misleading or unauthorised property listings or documents submitted by the User.",
              "The User's infringement of another person's intellectual property or privacy rights.",
              "The User's unauthorised use of the Platform or misuse of another person's personal data.",
            ]}
          />
          <p>
            Any indemnity under this clause shall be proportionate to the User&apos;s conduct and the loss attributable to
            that conduct. It shall not extend to loss caused by Reallow&apos;s own negligence, breach of contract,
            unlawful conduct or other act or omission for which the User cannot lawfully be held responsible.
          </p>
          <p>
            Reallow shall provide reasonable notice of an indemnity claim and an opportunity for the affected User to
            participate in its defence, where appropriate and lawful.
          </p>
        </Section>

        <Section title="19. Complaints and Dispute Resolution">
          <p>
            A User wishing to raise a complaint concerning Reallow&apos;s services should first submit the complaint
            through the Platform&apos;s support channel, providing relevant transaction references and supporting
            information.
          </p>
          <p>
            Reallow will review the complaint and use reasonable efforts to respond within a reasonable period, taking
            into account its nature and complexity.
          </p>
          <p>Where a dispute cannot be resolved informally, the parties may explore mediation or another mutually agreed dispute resolution process.</p>
          <p>Nothing in this clause prevents either party from approaching a competent court or regulator or exercising any statutory right.</p>
        </Section>

        <Section title="20. Force Majeure">
          <p>
            Reallow shall not be liable for a delay or failure to perform an obligation to the extent directly caused by
            circumstances beyond its reasonable control, including natural disasters, civil unrest, government
            restrictions, widespread network failures, power outages, cyber incidents or interruptions to essential
            third-party services.
          </p>
          <p>Reallow shall take reasonable steps to mitigate the effects of such circumstances and resume affected services when reasonably practicable.</p>
          <p>This clause does not excuse obligations that applicable law requires Reallow to perform notwithstanding such circumstances.</p>
        </Section>

        <Section title="21. Amendments to These Terms">
          <p>Reallow may amend these Terms to reflect changes in its services, operational requirements, security measures or applicable law.</p>
          <p>Material amendments shall be communicated through the Platform or another appropriate channel, with reasonable notice where required by law.</p>
          <p>
            Where an amendment materially affects an existing User&apos;s contractual rights, Reallow shall obtain any
            consent required by law. Continued use of the Platform after an amendment takes effect may constitute
            acceptance only where such acceptance is legally effective and the applicable notice requirements have been
            satisfied.
          </p>
          <p>Changes shall not retrospectively alter completed Transactions or accrued rights except as permitted by law or agreed by the affected parties.</p>
        </Section>

        <Section title="22. Governing Law and Jurisdiction">
          <p>These Terms shall be governed by the laws of the Federal Republic of Nigeria.</p>
          <p>
            Subject to applicable statutory requirements and any valid dispute resolution agreement, disputes arising
            from these Terms shall be submitted to a court of competent jurisdiction in Nigeria.
          </p>
          <p>
            Nothing in this clause deprives a User of a mandatory legal right to bring proceedings before another court or
            forum where applicable law permits or requires it.
          </p>
        </Section>

        <Section title="23. General Provisions">
          <p>
            <strong className="text-foreground">Entire agreement:</strong> These Terms, together with the applicable{" "}
            <a href="/privacy" className="underline">Privacy Notice</a>, disclosed transaction terms and any separate
            agreement expressly incorporated into them, constitute the agreement governing use of the Platform.
          </p>
          <p>
            <strong className="text-foreground">Severability:</strong> If any provision is held invalid or unenforceable,
            it shall be modified to the minimum extent necessary where legally permissible, and the remaining provisions
            shall continue in effect.
          </p>
          <p>
            <strong className="text-foreground">No waiver:</strong> Failure or delay by Reallow in exercising a right shall
            not constitute a waiver of that right.
          </p>
          <p>
            <strong className="text-foreground">Assignment:</strong> Reallow may assign or transfer its rights and
            obligations in connection with a legitimate corporate restructuring, merger or transfer of business, subject
            to applicable law and any required notice or consent. Users may not transfer their accounts or rights under
            these Terms without Reallow&apos;s consent.
          </p>
          <p>
            <strong className="text-foreground">Electronic communications:</strong> Subject to applicable law, notices,
            confirmations, records and signatures communicated or executed electronically may be used in connection with
            Platform activities and Transactions.
          </p>
          <p>
            <strong className="text-foreground">Third-party rights:</strong> Except where expressly provided or required by
            law, these Terms do not create enforceable rights in favour of persons who are not parties to them.
          </p>
          <p>
            <strong className="text-foreground">Survival:</strong> Provisions relating to accrued payment obligations,
            intellectual property, privacy, indemnification, limitation of liability, dispute resolution and other
            provisions intended by their nature to survive shall continue to apply after account closure or termination.
          </p>
        </Section>

        <Section title="24. Contact and Notices">
          <p>
            Questions, complaints, privacy requests and formal notices relating to these Terms may be submitted through the
            Platform&apos;s support channel or the contact details below.
          </p>
          <p>
            <strong className="text-foreground">Company:</strong> {COMPANY_NAME}
            <br />
            <strong className="text-foreground">Registered address:</strong> 83 Effurun-Sapele Road, Effurun, Warri, Delta
            State, Nigeria.
            <br />
            <strong className="text-foreground">Email:</strong>{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
            <br />
            <strong className="text-foreground">Phone:</strong>{" "}
            <a href={`tel:${SUPPORT_PHONES[0]}`} className="underline">
              {SUPPORT_PHONES[0]}
            </a>
            <br />
            <strong className="text-foreground">Website:</strong>{" "}
            <a href="https://reelo-pearl.vercel.app/" className="underline">
              https://reelo-pearl.vercel.app/
            </a>
          </p>
          <p>
            By using Reallow, you acknowledge that you have had the opportunity to read these Terms and understand the
            role of Reallow as a property transaction facilitation platform.
          </p>
        </Section>
      </div>
    </div>
  );
}
