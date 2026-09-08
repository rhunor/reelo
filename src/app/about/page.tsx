import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem, HoverLift, PulseDot } from "@/components/reveal";

export const metadata = { title: "About — Reallow" };

const steps = [
  {
    number: "01",
    title: "Search & compare",
    body: "Browse verified listings in Abuja with a full, itemised cost breakdown up front — rent, caution fee, estate charge, agency fee, legal fee. No hidden line items later.",
  },
  {
    number: "02",
    title: "Apply & get approved",
    body: "Express interest in a property and the landlord reviews you directly. Once they approve, you move to the next step — no cold showings, no wasted trips.",
  },
  {
    number: "03",
    title: "Pay for inspection & view it in person",
    body: "Book a paid, location-priced inspection and one of our agents shows you the actual property, in person, before you commit to anything.",
  },
  {
    number: "04",
    title: "Sign & move in",
    body: "Sign the tenancy agreement and pay through Reallow — rent, caution fee, and fees all go into one secure account, with a receipt for every kobo.",
  },
];

const values = [
  {
    title: "Verified, not just listed",
    body: "Every landlord completes identity verification, and every property is inspected in person by a Reallow agent before it ever goes live.",
  },
  {
    title: "Transparent pricing",
    body: "Every cost is itemised and shown before you pay anything — rent, caution fee, estate charge, agency fee, legal fee. What you're quoted is what you pay.",
  },
  {
    title: "No middleman runaround",
    body: "Reallow coordinates every inquiry, inspection, and signature directly, so nothing gets lost between five different phone calls to five different people.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex-1">
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-clay uppercase">About Reallow</p>
          <h1 className="mt-4 text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
            Finding a home shouldn&apos;t feel like a second job.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            Reallow connects tenants and landlords directly — no agent standing between you, no
            runaround, no guesswork about what you&apos;re actually getting into. What you see is
            what you get, and what you&apos;re quoted is what you pay.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            >
              Browse listings
            </Link>
            <Link
              href="/register"
              className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
            >
              List your property
            </Link>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl">
            <Image
              src="https://picsum.photos/seed/reallow-about-hero/1000/1250"
              alt="A tenant and landlord meeting at a Reallow-verified property"
              fill
              className="object-cover"
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-foreground/60">
            <PulseDot className="h-2 w-2 rounded-full bg-verified" />
            Every listing verified in person before it goes live
          </div>
        </Reveal>
      </section>

      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <Reveal direction="right">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl lg:order-2">
              <Image
                src="https://picsum.photos/seed/reallow-about-story/900/700"
                alt="An apartment building in Abuja"
                fill
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal className="lg:order-1">
            <p className="font-mono text-xs tracking-widest text-clay uppercase">Why we exist</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Renting in Nigeria runs on trust that&apos;s hard to verify.
            </h2>
            <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-foreground/80">
              <p>
                Too much of renting still depends on whoever you happen to know, and whether the
                agent showing you a property is telling the truth about who owns it. Reallow
                exists to replace that uncertainty with something you can actually check: verified
                identities, an in-person inspection before a listing is published, and a paper
                trail for every payment.
              </p>
              <p>
                We handle the parts that usually make renting stressful — verifying every landlord
                and every listing, coordinating every inquiry and inspection so nothing falls
                through the cracks, drafting the tenancy agreement, and collecting payments into
                one place with a clear, itemised breakdown before you commit to anything.
              </p>
              <p>
                For landlords, Reallow means faster, better-matched tenants — verified, serious,
                and ready to move — without the cost or hassle of fielding inquiries yourself.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs tracking-widest text-clay uppercase">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            From search to move-in, all in one place.
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-2">
          {steps.map((step) => (
            <RevealItem key={step.number}>
              <HoverLift className="h-full rounded-2xl border border-line bg-background p-6">
                <span className="font-mono text-sm text-clay">{step.number}</span>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{step.body}</p>
              </HoverLift>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <p className="font-mono text-xs tracking-widest text-clay uppercase">What we stand for</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Built around trust you can check, not trust you have to take on faith.
            </h2>
          </Reveal>

          <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-3">
            {values.map((value) => (
              <RevealItem key={value.title}>
                <div className="h-full rounded-2xl border border-line bg-background p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{value.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl">
            <Image
              src="https://picsum.photos/seed/reallow-about-abuja/900/700"
              alt="Abuja cityscape"
              fill
              className="object-cover"
            />
          </div>
        </Reveal>
        <Reveal direction="left" delay={0.1}>
          <p className="font-mono text-xs tracking-widest text-clay uppercase">Where we operate</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Reallow currently operates in Abuja.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-foreground/80">
            Every landlord, listing, and inspection on Reallow today is based in Abuja — that
            focus is deliberate, so we can actually verify what we say we verify, in person,
            rather than spreading thin across cities we can&apos;t physically reach yet.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-foreground/80">
            Not in your city yet? We&apos;re expanding — hang tight.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-line">
        <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to see it for yourself?</h2>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70">
            Browse verified listings in Abuja, or list your property and get matched with
            verified, serious tenants.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            >
              Browse listings
            </Link>
            <Link
              href="/register"
              className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
            >
              List your property
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
