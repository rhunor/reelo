const OLD_FEES = [
  { label: "Agent commission", amount: "10% of annual rent" },
  { label: "Legal / agreement fee", amount: "5–10% of annual rent" },
  { label: "Inspection fees", amount: "variable, per visit" },
];

export function FeeLedger() {
  return (
    <div className="rounded-2xl border border-line bg-background px-6 py-6 font-mono text-sm">
      <p className="text-xs tracking-wide text-foreground/50 uppercase">
        What you&apos;re not paying anymore
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {OLD_FEES.map((fee) => (
          <div key={fee.label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-line pb-3">
            <span className="text-foreground/40 line-through decoration-clay/60 decoration-2">
              {fee.label}
            </span>
            <span className="shrink-0 text-foreground/40 line-through decoration-clay/60 decoration-2">
              {fee.amount}
            </span>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-4 pt-1">
          <span className="font-medium text-verified">Reallow fee</span>
          <span className="shrink-0 font-medium text-verified">disclosed upfront</span>
        </div>
      </div>

      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-foreground/60">
        On a ₦1,000,000/year rent, the old stack cost ₦150,000–250,000 before you even moved in —
        often without an itemised breakdown until the deal was nearly done.
      </p>
    </div>
  );
}
