import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HomeHero } from "@/components/home-hero";
import { PeopleSlideshow } from "@/components/home/people-slideshow";
import { FaqList } from "@/components/faq-list";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { formatRate, getServiceChargeRate } from "@/lib/fees";
import { FAQ_TOPICS } from "@/lib/faqs";
import { PEOPLE_PHOTOS } from "@/lib/home-photos";
import { APP_LINKS } from "@/lib/app-links";
import { getT } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { ctaLinks } from "@/lib/cta-links";

function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-foreground/70">{intro}</p>}
    </Reveal>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clay/10 text-clay">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d={path} />
      </svg>
    </span>
  );
}

const ICON = {
  shield: "M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3Zm-3 9 2 2 4-4",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3",
  lock: "M6 11h12v10H6V11Zm2 0V7a4 4 0 1 1 8 0v4",
  doc: "M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6",
  calendar: "M4 6h16v15H4V6Zm0 5h16M9 3v4M15 3v4",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0 2-3h11M16 14h2",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9Zm4.3 11a2 2 0 0 0 3.4 0",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z",
  home: "M3 11l9-7 9 7v10H3V11Zm6 10v-6h6v6",
};

export default async function Home() {
  const t = await getT();
  const links = ctaLinks(await auth());
  const faqs = FAQ_TOPICS.flatMap((t) => t.faqs).filter((f) =>
    [
      "What will I pay in total?",
      "Can I contact the landlord (or applicant) directly?",
      "Why isn't my listing live yet?",
      "How does the Reallow wallet work?",
    ].includes(f.q),
  );

  return (
    <div className="flex-1">
      <HomeHero listPropertyHref={links.listProperty} />

      {/* Reallow is for everybody */}
      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionHeading
            eyebrow={t("home.everyoneEyebrow")}
            title={t("home.everyoneTitle")}
            intro="Market traders, mechanics, office workers, students, artisans, families. Reallow was built for everyday Nigerians who are tired of fake listings, endless agent fees, and money that disappears."
          />
          <div className="mt-8 sm:mt-10">
            <PeopleSlideshow photos={PEOPLE_PHOTOS} />
          </div>
        </div>
      </section>

      {/* Old way vs Reallow — desktop/tablet only, to keep the phone scroll short */}
      <section className="mx-auto hidden w-full max-w-6xl px-4 py-20 sm:px-6 md:block">
        <SectionHeading
          eyebrow="Why Reallow"
          title="House-hunting in Nigeria shouldn't feel like a gamble."
          intro="We rebuilt renting and buying around one idea: you should know exactly who you're dealing with and exactly what you're paying."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal direction="left" className="rounded-3xl border border-line p-6 sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-foreground/50 uppercase">The old way</p>
            <ul className="mt-5 flex flex-col gap-4">
              {[
                "Agents and middlemen asking for “agreement” and “commission” on top of rent",
                "Paying an inspection fee to see a house that doesn't exist — or isn't what was shown",
                "Charges that keep appearing after you've agreed a price",
                "Handing cash to someone you met yesterday and hoping for the best",
                "Chasing a lawyer and paying extra for a tenancy agreement",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-foreground/70">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs text-red-600">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal direction="right" className="rounded-3xl border border-clay/30 bg-clay/[0.06] p-6 sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-clay uppercase">The Reallow way</p>
            <ul className="mt-5 flex flex-col gap-4">
              {[
                "One clear service charge, shown upfront — no agent, no hidden commission",
                "Every listing inspected in person by a Reallow agent before it goes live",
                "The full cost, itemised to the naira, before you pay anything",
                "Your money held by Reallow, never sent to a stranger's account",
                "A complete digital tenancy agreement, signed online, at no extra cost",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-verified/15 text-xs text-verified">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-foreground/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionHeading eyebrow={t("home.howEyebrow")} title={t("home.howTitle")} />
          <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-2">
            {[
              {
                title: "Renting or buying",
                cta: { href: "/listings", label: "Find a home" },
                steps: [
                  ["Browse verified properties", "Filter by city, district, type and budget. Save the ones you like for later."],
                  ["Apply in one tap", "The landlord sees only what you choose to share on your profile — never your number."],
                  ["Book an inspection or meeting", "Pick a day on your Meetings calendar. A Reallow agent goes with you."],
                  ["Sign and pay through Reallow", "Sign the digital agreement, pay the itemised total, and get your keys."],
                ],
              },
              {
                title: "Letting or selling",
                cta: { href: links.listProperty, label: "List your property" },
                steps: [
                  ["List your property — free", "Add photos and details, review your cost breakdown, and confirm."],
                  ["We verify it in person", "A Reallow agent visits at a time you confirm. Then your listing goes live."],
                  ["Choose who you accept", "Review applicants' verified profiles and accept or decline with one tap."],
                  ["Get paid the full amount", "Your rent, caution fee and estate charge — or full sale price — paid out by Reallow."],
                ],
              },
            ].map((track, t) => (
              <Reveal key={track.title} delay={t * 0.1} className="flex flex-col rounded-3xl border border-line bg-surface p-6 sm:p-8">
                <h3 className="text-xl font-semibold">{track.title}</h3>
                <ol className="mt-6 flex flex-1 flex-col gap-5">
                  {track.steps.map(([title, body], i) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay font-mono text-sm font-semibold text-white">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-medium">{title}</span>
                        <span className="mt-0.5 block text-sm text-foreground/60">{body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={track.cta.href}
                  className="mt-8 flex h-11 w-fit items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
                >
                  {track.cta.label} →
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div>
          <SectionHeading
            eyebrow={t("home.transparencyEyebrow")}
            title={t("home.transparencyTitle")}
            intro={
              <>
                Every listing shows exactly what you&apos;ll pay before you commit. Reallow&apos;s only charge is a flat service
                charge — {formatRate(getServiceChargeRate("rent"))} of the annual rent on a tenancy,{" "}
                {formatRate(getServiceChargeRate("sale"))} of the price on a sale — paid on top, never taken out of the
                owner&apos;s money.
              </>
            }
          />
          <RevealGroup className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["No agent commission", "No “agreement fee”, “legal fee” or “knocking fee”."],
              ["No surprise charges", "If it isn't shown before you pay, you don't pay it."],
              ["Owners get the full amount", "Rent, caution fee and estate charge go to the landlord."],
              ["Every payment receipted", "Every naira is recorded in your transaction history."],
            ].map(([title, body]) => (
              <RevealItem key={title} className="rounded-2xl border border-line p-4">
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-foreground/60">{body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

      </section>

      {/* Landlord pitch */}
      <section className="border-y border-white/10 bg-[#1b1611] text-[#f5efe6]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <Reveal direction="left" className="relative order-last aspect-[4/3] overflow-hidden rounded-3xl lg:order-first">
            <Image
              src="https://images.unsplash.com/photo-1757970326337-95d7cca56fa1?q=80&w=1200&auto=format&fit=crop"
              alt="A modern apartment building — the kind of property landlords list on Reallow"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </Reveal>
          <div>
            <p className="font-mono text-xs tracking-widest text-[#ec8a5e] uppercase">{t("home.landlordEyebrow")}</p>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              {t("home.landlordTitle")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#f5efe6]/70">
              Listing is free, and you keep every naira of your asking price. Reallow verifies your tenants, arranges every
              viewing, drafts the agreement and collects the money — you just choose who you accept.
            </p>
            <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Free to list", "No listing fee, no subscription."],
                ["Verified applicants only", "Every applicant's identity is checked against government records."],
                ["We handle the viewings", "Reallow's agents bring applicants to you."],
                ["Paid in full, on record", "Your full amount, paid out by Reallow."],
              ].map(([title, body]) => (
                <RevealItem key={title} className="rounded-2xl bg-white/5 p-4">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-[#f5efe6]/60">{body}</p>
                </RevealItem>
              ))}
            </RevealGroup>
            <Link
              href={links.listProperty}
              className="mt-8 inline-flex h-12 items-center rounded-full bg-[#e8774a] px-6 font-medium text-white hover:opacity-90"
            >
              {t("home.ctaList")}
            </Link>
          </div>
        </div>
      </section>

      {/* Safety — desktop/tablet only */}
      <section className="mx-auto hidden w-full max-w-6xl px-4 py-20 sm:px-6 md:block">
        <SectionHeading
          eyebrow="Safety, built in"
          title="Protected at every step."
          intro="Scams thrive when strangers swap phone numbers and cash. On Reallow, that simply can't happen."
        />
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [ICON.home, "Inspected in person", "A Reallow agent visits, films and photographs every property before it's published."],
            [ICON.shield, "Identity-verified users", "Landlords and applicants verify their NIN or driver's licence — no anonymous accounts."],
            [ICON.lock, "Your details stay private", "Phone numbers and emails are never shown to other users. Only Reallow contacts you."],
            [ICON.receipt, "Money held by Reallow", "Payments go into Reallow's account, never a stranger's, until the deal is done."],
            [ICON.doc, "Digital tenancy agreement", "A complete agreement, signed online by both sides, with a secure record of who signed."],
            [ICON.star, "Rate every visit", "Tell us how each inspection went — late, rude or brilliant, we act on it."],
          ].map(([icon, title, body]) => (
            <RevealItem key={title} className="rounded-3xl border border-line p-6">
              <Icon path={icon} />
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">{body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Referrals */}
      <section className="border-y border-line bg-gradient-to-br from-clay/[0.1] via-gold/[0.06] to-transparent">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow={t("home.referEyebrow")}
              title={t("home.referTitle")}
              intro="Every account comes with a personal referral code. When someone signs up with your code and completes a deal on Reallow, you earn a percentage of the sale — straight into your Reallow wallet."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={links.referralCode} className="flex h-12 items-center rounded-full bg-clay px-6 font-medium text-white hover:opacity-90">
                {links.signedIn ? "See your referral code" : "Get your referral code"}
              </Link>
              <Link
                href="/help#referrals"
                className="flex h-12 items-center rounded-full border border-line px-6 font-medium hover:border-clay hover:text-clay"
              >
                How referrals work
              </Link>
            </div>
          </div>
          <RevealGroup className="flex flex-col gap-3">
            {[
              ["1", "Share your code", "Find it on your dashboard and send your invite link to friends, family and colleagues."],
              ["2", "They find a home", "They sign up with your code, then rent or buy through Reallow."],
              ["3", "You get paid", "Your earnings land in your wallet once approved. Withdraw to your bank from ₦3,000."],
            ].map(([n, title, body]) => (
              <RevealItem key={n} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                <span className="font-display text-3xl font-semibold text-clay">{n}</span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-foreground/60">{body}</span>
                </span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Everything in one place — desktop/tablet only */}
      <section className="mx-auto hidden w-full max-w-6xl px-4 py-20 sm:px-6 md:block">
        <SectionHeading
          eyebrow="Everything in one place"
          title="Your whole move, managed from one dashboard."
        />
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [ICON.calendar, "Meetings calendar", "Book inspections and meetings, accept or suggest new times, and see your history at a glance."],
            [ICON.wallet, "Reallow wallet", "Fund your wallet, pay inspection fees in a tap, and collect your referral earnings."],
            [ICON.receipt, "Transaction history", "Every payment and credit, with date and time, sorted however you like."],
            [ICON.bell, "Instant notifications", "Know the moment a landlord accepts you or a meeting is confirmed — in the app and by email."],
            [ICON.people, "One account for everything", "Rent, buy, let and sell from the same account. No switching profiles."],
            [ICON.globe, "Your language", "Use Reallow in English, Yorùbá, Hausa, Igbo, Pidgin or Urhobo."],
          ].map(([icon, title, body]) => (
            <RevealItem key={title} className="flex gap-4 rounded-3xl border border-line p-6">
              <Icon path={icon} />
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-foreground/60">{body}</span>
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* FAQs */}
      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading eyebrow="FAQ" title={t("home.faqTitle")} />
            <Link href="/help" className="mt-6 inline-block text-sm font-medium text-clay hover:underline">
              Visit the help centre →
            </Link>
          </div>
          <Reveal>
            <FaqList faqs={faqs} />
          </Reveal>
        </div>
      </section>

      {/* Get the app */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-clay px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/5" />
          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <p className="font-mono text-xs tracking-widest uppercase opacity-80">Get the Reallow app</p>
              <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                {t("home.appTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed opacity-90">
                Browse verified listings, get notified the moment you&apos;re accepted, and manage your meetings and
                wallet on the go.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <StoreButton href={APP_LINKS.ios} store="App Store" kicker="Download on the" />
                <StoreButton href={APP_LINKS.android} store="Google Play" kicker="Get it on" />
              </div>
            </div>
            <div className="hidden justify-center lg:flex">
              <div className="w-56 rotate-3 rounded-[2.5rem] border-[10px] border-black/80 bg-background p-4 text-foreground shadow-2xl">
                <p className="text-xs text-foreground/50">Welcome back</p>
                <p className="font-semibold">Ada Okafor</p>
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {["Meetings", "History", "Wallet"].map((t) => (
                    <div key={t} className="rounded-lg bg-clay/10 p-2 text-center text-[9px] font-medium text-clay">{t}</div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-line p-2.5">
                  <p className="text-[10px] font-medium">Inspection confirmed</p>
                  <p className="text-[9px] text-foreground/50">Sat, 10:00am · Effurun</p>
                </div>
                <div className="mt-2 rounded-xl border border-line p-2.5">
                  <p className="text-[10px] font-medium">Landlord accepted you 🎉</p>
                  <p className="text-[9px] text-foreground/50">2-bedroom flat, Jabi</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t("home.finalTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-foreground/70">
              Join Reallow free today. Verified homes, honest prices, and a team that has your back.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={links.account} className="flex h-12 items-center rounded-full bg-clay px-7 font-medium text-white hover:opacity-90">
                {links.signedIn ? t("nav.dashboard") : t("home.finalCta")}
              </Link>
              <Link href="/listings" className="flex h-12 items-center rounded-full border border-line px-7 font-medium hover:border-clay hover:text-clay">
                {t("home.ctaFind")}
              </Link>
            </div>
          </Reveal>
          <p className="mt-16 max-w-3xl text-[11px] leading-relaxed text-foreground/40">
            Photo credits (Wikimedia Commons):{" "}
            {PEOPLE_PHOTOS.map((photo, i) => (
              <span key={photo.src}>
                <a href={photo.credit.source} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/70">
                  {photo.credit.author}
                </a>
                {i < PEOPLE_PHOTOS.length - 1 ? ", " : ""}
              </span>
            ))}{" "}
            —{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/70">
              CC BY-SA 4.0
            </a>
            , cropped. People shown are illustrative and not Reallow customers.
          </p>
        </div>
      </section>
    </div>
  );
}

function StoreButton({ href, store, kicker }: { href?: string; store: string; kicker: string }) {
  const content = (
    <>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        {store === "App Store" ? (
          <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.9-4.2ZM14 5.4c.7-.8 1.2-2 1-3.1-1 0-2.2.7-3 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.3-.6 3-1.4Z" />
        ) : (
          <path d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.7-.6-1.2V3.5c0-.5.2-1 .6-1.2Zm11 8.5 2.7-2.7L5.4 1.3l9.2 9.5Zm0 2.4-9.2 9.5 11.9-6.8-2.7-2.7Zm3.9-4.4L21 10.2c.7.4.7 1.4 0 1.8l-2.5 1.4L15.6 12l2.9-3.2Z" />
        )}
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] opacity-80">{href ? kicker : "Coming soon to"}</span>
        <span className="block text-base font-semibold">{store}</span>
      </span>
    </>
  );

  const className = "flex h-14 items-center gap-3 rounded-2xl bg-black px-5 text-white";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${className} transition-transform hover:-translate-y-0.5`}>
      {content}
    </a>
  ) : (
    <span className={`${className} cursor-default opacity-80`} aria-disabled>
      {content}
    </span>
  );
}
