import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import { SubscribeButton } from "@/components/subscribe-button";

const FEATURES: Record<keyof typeof SUBSCRIPTION_TIERS, string[]> = {
  free: ["Browse & search every listing", "No listing inquiries", "No inspection bookings"],
  pro: ["Browse & search every listing", "Contact Reallow about any listing", "5 inspection bookings a month"],
  pro_plus: ["Browse & search every listing", "Contact Reallow about any listing", "Unlimited inspection bookings"],
};

export default function PricingPage() {
  const tiers = Object.entries(SUBSCRIPTION_TIERS) as Array<
    [keyof typeof SUBSCRIPTION_TIERS, (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]]
  >;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Pricing</p>
      <h1 className="mt-3 max-w-lg text-4xl font-semibold tracking-tight">
        Browsing is free. Reaching Reallow isn&apos;t — and that&apos;s the only fee.
      </h1>
      <p className="mt-4 max-w-lg text-foreground/70">
        No agent commission, no legal fee, no inspection surcharge. Just one plan, priced monthly,
        that unlocks contacting Reallow about a listing and booking inspections.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {tiers.map(([key, tier]) => {
          const isPro = key === "pro";
          const isProPlus = key === "pro_plus";
          return (
            <div
              key={key}
              className={`flex flex-col rounded-2xl border p-6 ${
                isProPlus ? "border-gold bg-gold/5" : "border-line"
              }`}
            >
              {isProPlus && (
                <span className="mb-3 w-fit rounded-full bg-gold px-3 py-1 text-xs font-medium text-white">
                  Best value
                </span>
              )}
              <h2 className="font-display text-lg font-semibold">{tier.label}</h2>
              <p className="mt-2 font-mono text-3xl font-medium">
                {tier.priceNGN === 0 ? "₦0" : `₦${tier.priceNGN.toLocaleString()}`}
                {tier.priceNGN > 0 && <span className="text-base text-foreground/50">/mo</span>}
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-foreground/70">
                {FEATURES[key].map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className={isPro || isProPlus ? "text-verified" : "text-foreground/30"}>
                      {isPro || isProPlus ? "✓" : "–"}
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              {(isPro || isProPlus) && (
                <div className="mt-6">
                  <SubscribeButton tier={key} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-10 max-w-2xl text-sm text-foreground/50">
        Landlords pay separately: a one-off ₦15,000 fee books the in-person verification
        inspection every listing goes through before it can appear on Reallow, plus a small
        disclosed commission on completed tenancies.
      </p>
    </div>
  );
}
