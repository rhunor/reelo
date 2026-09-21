import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem, HoverLift, PulseDot } from "@/components/reveal";

export const metadata = { title: "About — Reallow" };

const steps = [
  {
    number: "01",
    title: "Search & compare",
    body: "Browse verified listings across Abuja, Port Harcourt, and Warri with a full, itemised cost breakdown up front — rent or price, caution fee, estate charge, agency fee, legal fee. No hidden line items later.",
  },
  {
    number: "02",
    title: "Apply & get approved",
    body: "Express interest in a property and the owner reviews you directly. Once they approve, you move to the next step — no cold showings, no wasted trips.",
  },
  {
    number: "03",
    title: "Inspect it in person",
    body: "Book a paid, location-priced inspection and one of our agents shows you the actual property, in person, before you commit to anything.",
  },
  {
    number: "04",
    title: "Sign & close",
    body: "Sign the tenancy agreement or sale paperwork and pay through Reallow — everything goes into one secure account, with a receipt for every kobo.",
  },
];

const values = [
  {
    title: "Verified, not just listed",
    body: "Every account is identity-verified, and every property is inspected in person by a Reallow agent before it ever goes live.",
  },
  {
    title: "Transparent pricing",
    body: "Every cost is itemised and shown before you pay anything — rent or price, caution fee, estate charge, agency fee, legal fee. What you're quoted is what you pay.",
  },
  {
    title: "Effortless, start to finish",
    body: "Reallow coordinates every inquiry, inspection, and signature for you, so finding, renting, buying, or selling a home stops feeling like a part-time job.",
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
            Reallow is where you rent, buy, or sell property directly — verified identities on
            both sides, an in-person inspection before anything goes live, and a clear, itemised
            price before you commit to anything. The whole point is ease: less back-and-forth,
            fewer surprises, faster to a place you can actually move into.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            >
              Browse listings
            </Link>
            <Link
              href="/register?role=landlord"
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
              alt="A property owner and a prospective tenant meeting at a Reallow-verified property"
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
                alt="An apartment building"
                fill
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal className="lg:order-1">
            <p className="font-mono text-xs tracking-widest text-clay uppercase">Why we exist</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Renting and buying in Nigeria runs on trust that&apos;s hard to verify.
            </h2>
            <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-foreground/80">
              <p>
                Too much of it still depends on whoever you happen to know, and whether the person
                showing you a property is telling the truth about who owns it. Reallow exists to
                replace that uncertainty with something you can actually check: verified
                identities, an in-person inspection before a listing is published, and a paper
                trail for every payment.
              </p>
              <p>
                Reallow handles the parts that usually make this stressful — verifying every
                account and every listing, coordinating every inquiry and inspection so nothing
                falls through the cracks, drafting the paperwork, and collecting payments into one
                place with a clear, itemised breakdown before anyone commits to anything.
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
          <div className="grid gap-10 lg:grid-cols-2">
            <Reveal className="rounded-2xl border border-line bg-background p-8">
              <p className="font-mono text-xs tracking-widest text-clay uppercase">For tenants &amp; buyers</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                See the real cost, see the real place, before you commit.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                No guessing what you&apos;ll actually owe, no showings for a property that turns
                out to be someone else&apos;s. Every listing is verified and itemised before you
                pay a naira.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="rounded-2xl border border-line bg-background p-8">
              <p className="font-mono text-xs tracking-widest text-clay uppercase">For property owners</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Faster, serious inquiries — without doing the legwork yourself.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                Reallow verifies every applicant, fields every inquiry, and coordinates every
                inspection on your behalf, so you only ever hear from people who are actually
                ready to move — whether you&apos;re renting out or selling.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
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
      </section>

      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <Reveal>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl">
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Zuma_Rock.jpg"
                alt="Zuma Rock, a landmark near Abuja"
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-xs text-foreground/40">
              Zuma Rock, Niger State — photo by Jeff Attaway, CC BY 2.0
            </p>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <p className="font-mono text-xs tracking-widest text-clay uppercase">Where we operate</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Reallow currently operates in Abuja, Port Harcourt, and Warri.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-foreground/80">
              Every account, listing, and inspection on Reallow today is based in one of these
              three cities — that focus is deliberate, so we can actually verify what we say we
              verify, in person, rather than spreading thin across places we can&apos;t
              physically reach yet.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center lg:py-28">
          <Reveal>
            <p className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Not in your city yet?
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-clay sm:text-5xl">
              We&apos;re expanding — hang tight.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line">
        <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to see it for yourself?</h2>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70">
            Browse verified listings, or list your property and get matched with verified,
            serious applicants.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            >
              Browse listings
            </Link>
            <Link
              href="/register?role=landlord"
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
