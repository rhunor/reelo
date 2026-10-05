import type { Agreement } from "@/types/models";

function naira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

function Clause({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h3 className="font-display text-base font-semibold">
        {number}. {title}
      </h3>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

// The full, generated tenancy agreement — Reallow drafts this itself instead of charging a
// separate legal fee for a lawyer to. Everything specific to the deal comes from the
// agreement's own (snapshotted) terms; the clauses themselves are standard. Clause numbers
// are computed so optional sections (estate charge, house rules, additional terms) don't
// leave gaps.
export function TenancyAgreementDocument({
  agreement,
  landlordName,
  tenantName,
  propertyAddress,
  propertyDescription,
  houseRules,
}: {
  agreement: Agreement;
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  propertyDescription?: string;
  houseRules: string[];
}) {
  const { terms } = agreement;
  const start = new Date(terms.leaseStart);
  const termMonths = typeof terms.leaseEndOrTermMonths === "number" ? terms.leaseEndOrTermMonths : null;
  const end =
    termMonths !== null
      ? (() => {
          const d = new Date(start);
          d.setMonth(d.getMonth() + termMonths);
          d.setDate(d.getDate() - 1);
          return d;
        })()
      : new Date(terms.leaseEndOrTermMonths as Date);

  let n = 0;
  const next = () => ++n;

  const signatureFor = (party: "landlord" | "tenant") => agreement.signatures.find((s) => s.party === party);

  return (
    <article className="rounded-lg border border-line p-6 text-sm leading-relaxed text-foreground/85 sm:p-10 print:border-0 print:p-0">
      <header className="text-center">
        <p className="font-mono text-xs tracking-widest text-clay uppercase">Reallow</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Tenancy Agreement</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Agreement ref. {agreement._id!.toString()} · Prepared {formatDate(agreement.createdAt)}
        </p>
      </header>

      <p className="mt-8">
        This Tenancy Agreement is made between <strong>{landlordName}</strong> (&quot;the
        Landlord&quot;) and <strong>{tenantName}</strong> (&quot;the Tenant&quot;), and was
        arranged through Reallow (&quot;Reallow&quot;), which coordinated it and handles the
        payments described below but is not itself a party to the tenancy.
      </p>

      <Clause number={next()} title="The property">
        <p>
          The Landlord lets to the Tenant the property at <strong>{propertyAddress}</strong>
          {propertyDescription ? <> ({propertyDescription})</> : null}, together with its
          fixtures and fittings (&quot;the Property&quot;).
        </p>
      </Clause>

      <Clause number={next()} title="Term">
        <p>
          The tenancy begins on <strong>{formatDate(start)}</strong>
          {termMonths !== null ? (
            <>
              {" "}and runs for <strong>{termMonths} month{termMonths === 1 ? "" : "s"}</strong>
            </>
          ) : null}
          , ending
          on <strong>{formatDate(end)}</strong>.
        </p>
      </Clause>

      <Clause number={next()} title="Rent">
        <p>
          The rent is <strong>{naira(terms.rentNGN)} per year</strong>, paid in advance for the
          term. The Tenant pays it through Reallow, never directly to the Landlord; Reallow holds
          it and pays it out to the Landlord.
        </p>
      </Clause>

      <Clause number={next()} title="Caution fee">
        <p>
          The Tenant pays a caution fee of <strong>{naira(terms.depositNGN)}</strong>, collected
          through Reallow with the rent and paid to the Landlord. Reallow does not hold the
          caution fee; any return of it at the end of the tenancy, and any deductions for damage,
          are a matter between the Landlord and the Tenant.
        </p>
      </Clause>

      {terms.estateChargeNGN ? (
        <Clause number={next()} title="Estate / service charge">
          <p>
            The Tenant also pays an estate or service charge of{" "}
            <strong>{naira(terms.estateChargeNGN)}</strong>, collected through Reallow with the
            rent.
          </p>
        </Clause>
      ) : null}

      <Clause number={next()} title="Use of the property">
        <p>
          The Tenant will use the Property only as a private residence for themselves and their
          household, and not for any illegal, immoral, or commercial purpose without the
          Landlord&apos;s written consent.
        </p>
      </Clause>

      <Clause number={next()} title="The Tenant agrees to">
        <ul className="list-disc space-y-1 pl-5">
          <li>Keep the Property clean and in good condition, fair wear and tear excepted.</li>
          <li>Pay for utilities and services used during the tenancy (such as electricity, water, and waste collection) unless agreed otherwise below.</li>
          <li>Not make structural alterations, or repaint, without the Landlord&apos;s written consent.</li>
          <li>Not sublet, assign, or part with possession of the Property without the Landlord&apos;s written consent.</li>
          <li>Report any damage or needed repair promptly.</li>
          <li>Allow the Landlord reasonable access for inspection or repairs, on at least 24 hours&apos; notice except in an emergency.</li>
          <li>Comply with any estate rules that apply to the Property.</li>
          <li>Return the Property, and all keys, at the end of the tenancy in the condition it was let in, fair wear and tear excepted.</li>
        </ul>
      </Clause>

      <Clause number={next()} title="The Landlord agrees to">
        <ul className="list-disc space-y-1 pl-5">
          <li>Let the Tenant have quiet enjoyment of the Property for the term without unnecessary interference.</li>
          <li>Keep the structure, roof, exterior, and major installations (plumbing, wiring) in repair, except damage caused by the Tenant.</li>
          <li>Pay any ground rent, property rates, or taxes due on the Property.</li>
          <li>Ensure the Property is habitable and matches its description at the start of the tenancy.</li>
          <li>Not enter the Property without notice, except in an emergency.</li>
        </ul>
      </Clause>

      {houseRules.length > 0 ? (
        <Clause number={next()} title="House rules">
          <p>The Tenant also agrees to the following rules set by the Landlord for this Property:</p>
          <ul className="list-disc space-y-1 pl-5">
            {houseRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Clause>
      ) : null}

      {terms.responsibilities?.trim() ? (
        <Clause number={next()} title="Additional terms">
          <p className="whitespace-pre-line break-words">{terms.responsibilities}</p>
        </Clause>
      ) : null}

      <Clause number={next()} title="Renewal and ending the tenancy">
        <p>
          The tenancy ends on the end date above unless both parties agree to renew it. A party
          who does not intend to renew should let the other know, through Reallow, at least three
          months before the end date.
        </p>
        <p>
          The tenancy may end early by agreement of both parties, recorded on Reallow. Rent paid
          in advance is not refundable on early termination unless both parties agree otherwise
          in writing.
        </p>
      </Clause>

      <Clause number={next()} title="Reallow's role">
        <p>
          Reallow arranged this agreement and collected the payments above. Once rent has been
          paid and the Tenant has taken possession, day-to-day matters
          under this tenancy are between the Landlord and the Tenant, in line with Reallow&apos;s
          Terms of Service.
        </p>
      </Clause>

      <Clause number={next()} title="Governing law">
        <p>
          This agreement is governed by the laws of the Federal Republic of Nigeria and of the
          state in which the Property is located.
        </p>
      </Clause>

      <Clause number={next()} title="Electronic signature">
        <p>
          Each party signs this agreement electronically by typing their full name on Reallow.
          Both parties agree to be bound by their electronic signatures as if signed by hand.
          Reallow records the time, IP address, and a unique signature fingerprint for each
          signature below.
        </p>
      </Clause>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 break-inside-avoid">
        {(["landlord", "tenant"] as const).map((party) => {
          const signature = signatureFor(party);
          const partyName = party === "landlord" ? landlordName : tenantName;
          return (
            <div key={party} className="rounded-md border border-line p-4">
              <p className="text-xs tracking-widest text-foreground/50 uppercase">{party}</p>
              <p className="mt-1 font-medium text-foreground">{partyName}</p>
              {signature ? (
                <>
                  <p className="mt-3 font-display text-xl italic text-foreground">
                    {signature.fullName ?? partyName}
                  </p>
                  <p className="mt-2 text-xs text-foreground/50">
                    Signed {new Date(signature.signedAt).toLocaleString("en-NG")}
                  </p>
                  <p className="text-xs text-foreground/50 break-all">
                    Fingerprint {signature.signatureHash.slice(0, 16)}…
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-foreground/50">Not yet signed</p>
              )}
            </div>
          );
        })}
      </section>
    </article>
  );
}
