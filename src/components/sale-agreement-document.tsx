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

const COMPLETION_TEXT: Record<string, string> = {
  completed: "a completed building, ready for occupation",
  carcass: "a carcass (a roofed shell without finishing)",
  under_construction: "a building still under construction",
};

// The short sale agreement shown before a buyer pays — the sale counterpart of
// TenancyAgreementDocument. It records the deal and Reallow's escrow role; the formal
// conveyancing documents (Deed of Assignment, Governor's Consent) are still done separately.
export function SaleAgreementDocument({
  agreement,
  sellerName,
  buyerName,
  propertyAddress,
  propertyDescription,
  completionStatus,
}: {
  agreement: Agreement;
  sellerName: string;
  buyerName: string;
  propertyAddress: string;
  propertyDescription?: string;
  completionStatus?: string;
}) {
  const { terms } = agreement;
  let n = 0;
  const next = () => ++n;
  const signatureFor = (party: "landlord" | "tenant") => agreement.signatures.find((s) => s.party === party);

  return (
    <article className="rounded-lg border border-line p-6 text-sm leading-relaxed text-foreground/85 sm:p-10 print:border-0 print:p-0">
      <header className="text-center">
        <p className="font-mono text-xs tracking-widest text-clay uppercase">Reallow</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Agreement for Sale of Property</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Agreement ref. {agreement._id!.toString()} · Prepared {formatDate(agreement.createdAt)}
        </p>
      </header>

      <p className="mt-8">
        This agreement is made between <strong>{sellerName}</strong> (&quot;the Seller&quot;) and{" "}
        <strong>{buyerName}</strong> (&quot;the Buyer&quot;), and is arranged through Reallow.
      </p>

      <Clause number={next()} title="The property">
        <p>
          The Seller agrees to sell, and the Buyer agrees to buy, the property at{" "}
          <strong>{propertyAddress}</strong>
          {propertyDescription ? ` (${propertyDescription})` : ""}
          {completionStatus && COMPLETION_TEXT[completionStatus] ? `, sold as ${COMPLETION_TEXT[completionStatus]}` : ""}{" "}
          (&quot;the Property&quot;), as inspected in person by Reallow before it was listed.
        </p>
      </Clause>

      <Clause number={next()} title="Price">
        <p>
          The purchase price is <strong>{naira(terms.rentNGN)}</strong>. Reallow&apos;s service charge is paid
          by the Buyer on top of this price and is not deducted from the Seller&apos;s amount.
        </p>
      </Clause>

      <Clause number={next()} title="Payment through Reallow">
        <p>
          The Buyer pays the full amount through Reallow only — never directly to the Seller or anyone
          else. Reallow holds the purchase price and releases it to the Seller once the title documents
          and keys have been handed over to the Buyer as set out below.
        </p>
      </Clause>

      <Clause number={next()} title="Title and handover">
        <p>
          The Seller confirms they own the Property, have the right to sell it, and that it is free of
          any undisclosed charge, mortgage or dispute. The Seller will hand over the original title
          documents (for example the Certificate of Occupancy or prior Deed of Assignment), sign a Deed of
          Assignment in the Buyer&apos;s favour, and give vacant possession and the keys.
        </p>
        <p>
          The parties will complete the formal transfer, including any Governor&apos;s Consent and
          registration, with their own lawyers. Each party bears their own legal and registration costs
          unless they agree otherwise in writing.
        </p>
      </Clause>

      <Clause number={next()} title="If the sale can't be completed">
        <p>
          If the Seller cannot transfer good title or hand over the Property, Reallow returns the money it
          holds to the Buyer. Once the Seller has been paid out, any dispute is between the Buyer and the
          Seller.
        </p>
      </Clause>

      <Clause number={next()} title="Reallow's role">
        <p>
          Reallow verified both parties&apos; identities and inspected the Property in person, arranges
          communication between the parties, and holds the payment. Reallow is not the owner of the
          Property and does not give legal advice; the Buyer is encouraged to carry out their own searches
          before completing.
        </p>
      </Clause>

      <Clause number={next()} title="Electronic signature">
        <p>
          Each party signs this agreement electronically by typing their full name on Reallow. Both parties
          agree to be bound by their electronic signatures as if signed by hand. Reallow records the time,
          IP address and a unique fingerprint for each signature below.
        </p>
      </Clause>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 break-inside-avoid">
        {(["landlord", "tenant"] as const).map((party) => {
          const signature = signatureFor(party);
          const partyName = party === "landlord" ? sellerName : buyerName;
          return (
            <div key={party} className="rounded-md border border-line p-4">
              <p className="text-xs tracking-widest text-foreground/50 uppercase">{party === "landlord" ? "Seller" : "Buyer"}</p>
              <p className="mt-1 font-medium text-foreground">{partyName}</p>
              {signature ? (
                <>
                  <p className="mt-3 font-display text-xl italic text-foreground">{signature.fullName ?? partyName}</p>
                  <p className="mt-2 text-xs text-foreground/50">Signed {new Date(signature.signedAt).toLocaleString("en-NG")}</p>
                  <p className="text-xs text-foreground/50 break-all">Fingerprint {signature.signatureHash.slice(0, 16)}…</p>
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
