import type { FaqTopic } from "@/lib/faqs";

// Native <details> accordions — no JS needed, works in server components.
export function FaqList({ faqs }: { faqs: FaqTopic["faqs"] }) {
  return (
    <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {faqs.map((faq) => (
        <details key={faq.q} className="group px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
            {faq.q}
            <span className="shrink-0 text-foreground/40 transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
