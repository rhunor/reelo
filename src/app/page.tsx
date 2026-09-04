import { HomeHero } from "@/components/home-hero";
import { RevealGroup, RevealItem } from "@/components/reveal";

export default function Home() {
  return (
    <div className="flex-1">
      <HomeHero />

      <section className="border-t border-line bg-clay/5">
        <RevealGroup className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3">
          <RevealItem>
            <p className="font-display text-3xl font-semibold">NIN-verified</p>
            <p className="mt-2 text-sm text-foreground/70">
              Every landlord is identity-checked before a listing goes live — a real in-person
              inspection, not a rubber stamp.
            </p>
          </RevealItem>
          <RevealItem>
            <p className="font-display text-3xl font-semibold">Digital agreement</p>
            <p className="mt-2 text-sm text-foreground/70">
              A standardised tenancy agreement with e-signature, included — no separate lawyer
              fee for a copy-paste template.
            </p>
          </RevealItem>
          <RevealItem>
            <p className="font-display text-3xl font-semibold">Real support</p>
            <p className="mt-2 text-sm text-foreground/70">
              A direct line to Reallow for every inquiry, inspection, and dispute — not just an
              inbox that goes quiet.
            </p>
          </RevealItem>
        </RevealGroup>
      </section>
    </div>
  );
}
