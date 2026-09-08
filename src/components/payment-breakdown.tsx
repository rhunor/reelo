export interface BreakdownLine {
  label: string;
  amountNGN: number;
}

// Shared "what am I paying for and why" display — used before both the inspection-fee
// checkout and the agreement rent/deposit/fees checkout, so every payment on Reallow
// looks and reads the same way before a tenant is sent to Paystack.
export function PaymentBreakdown({
  lines,
  totalNGN,
  note,
}: {
  lines: BreakdownLine[];
  totalNGN: number;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-line p-3 text-sm">
      <dl className="flex flex-col gap-1.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between">
            <dt className="text-foreground/70">{line.label}</dt>
            <dd className="font-mono">₦{line.amountNGN.toLocaleString()}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-1.5 font-medium">
          <dt>Total</dt>
          <dd className="font-mono">₦{totalNGN.toLocaleString()}</dd>
        </div>
      </dl>
      {note && <p className="mt-2 text-xs text-foreground/50">{note}</p>}
    </div>
  );
}
