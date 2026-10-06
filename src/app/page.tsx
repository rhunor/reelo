import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HomeHero } from "@/components/home-hero";
import { PeopleSlideshow } from "@/components/home/people-slideshow";
import { FaqList } from "@/components/faq-list";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { formatRate, getServiceChargeRate } from "@/lib/fees";
import { translatedTopics } from "@/lib/faqs";
import { PEOPLE_PHOTOS } from "@/lib/home-photos";
import { APP_LINKS } from "@/lib/app-links";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";
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
  const faqs = translatedTopics(t)
    .flatMap((topic) => topic.faqs)
    .filter((f) => ["renting2", "renting4", "listing2", "payments1"].includes(f.id));

  return (
    <div className="flex-1">
      <HomeHero listPropertyHref={links.listProperty} />

      {/* Reallow is for everybody */}
      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionHeading
            eyebrow={t("home.everyoneEyebrow")}
            title={t("home.everyoneTitle")}
            intro={t("home.everyoneIntro")}
          />
          <div className="mt-8 sm:mt-10">
            <PeopleSlideshow
              photos={PEOPLE_PHOTOS.map((photo) => ({
                ...photo,
                caption: t(`people.${photo.id}.caption` as MessageKey),
                detail: t(`people.${photo.id}.detail` as MessageKey),
              }))}
            />
          </div>
        </div>
      </section>

      {/* Old way vs Reallow — desktop/tablet only, to keep the phone scroll short */}
      <section className="mx-auto hidden w-full max-w-6xl px-4 py-20 sm:px-6 md:block">
        <SectionHeading
          eyebrow={t("home.whyEyebrow")}
          title={t("home.whyTitle")}
          intro={t("home.whyIntro")}
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal direction="left" className="rounded-3xl border border-line p-6 sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-foreground/50 uppercase">{t("home.oldWay")}</p>
            <ul className="mt-5 flex flex-col gap-4">
              {[
                t("home.old1"),
                t("home.old2"),
                t("home.old3"),
                t("home.old4"),
                t("home.old5"),
              ].map((item) => (
                <li key={item} className="flex gap-3 text-foreground/70">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs text-red-600">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal direction="right" className="rounded-3xl border border-clay/30 bg-clay/[0.06] p-6 sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-clay uppercase">{t("home.reallowWay")}</p>
            <ul className="mt-5 flex flex-col gap-4">
              {[
                t("home.new1"),
                t("home.new2"),
                t("home.new3"),
                t("home.new4"),
                t("home.new5"),
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
                title: t("home.trackRentTitle"),
                cta: { href: "/listings", label: t("home.ctaFind") },
                steps: [
                  [t("home.rentStep1"), t("home.rentStep1Body")],
                  [t("home.rentStep2"), t("home.rentStep2Body")],
                  [t("home.rentStep3"), t("home.rentStep3Body")],
                  [t("home.rentStep4"), t("home.rentStep4Body")],
                ],
              },
              {
                title: t("home.trackLetTitle"),
                cta: { href: links.listProperty, label: t("nav.listProperty") },
                steps: [
                  [t("home.ctaList"), t("home.letStep1Body")],
                  [t("home.letStep2"), t("home.letStep2Body")],
                  [t("home.letStep3"), t("home.letStep3Body")],
                  [t("home.letStep4"), t("home.letStep4Body")],
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
                {t("home.transparencyIntro", {
                  rentRate: formatRate(getServiceChargeRate("rent")),
                  saleRate: formatRate(getServiceChargeRate("sale")),
                })}
              </>
            }
          />
          <RevealGroup className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t("home.tr1"), t("home.tr1Body")],
              [t("home.tr2"), t("home.tr2Body")],
              [t("home.tr3"), t("home.tr3Body")],
              [t("home.tr4"), t("home.tr4Body")],
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
              {t("home.landlordIntro")}
            </p>
            <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                [t("home.ll1"), t("home.ll1Body")],
                [t("home.ll2"), t("home.ll2Body")],
                [t("home.ll3"), t("home.ll3Body")],
                [t("home.ll4"), t("home.ll4Body")],
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
          eyebrow={t("home.safetyEyebrow")}
          title={t("home.safetyTitle")}
          intro={t("home.safetyIntro")}
        />
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [ICON.home, t("home.point1"), t("home.s1Body")],
            [ICON.shield, t("home.s2"), t("home.s2Body")],
            [ICON.lock, t("home.s3"), t("home.s3Body")],
            [ICON.receipt, t("home.s4"), t("home.s4Body")],
            [ICON.doc, t("home.s5"), t("home.s5Body")],
            [ICON.star, t("home.s6"), t("home.s6Body")],
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
              intro={t("home.referIntro")}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={links.referralCode} className="flex h-12 items-center rounded-full bg-clay px-6 font-medium text-white hover:opacity-90">
                {links.signedIn ? t("home.referSee") : t("home.referGet")}
              </Link>
              <Link
                href="/help#referrals"
                className="flex h-12 items-center rounded-full border border-line px-6 font-medium hover:border-clay hover:text-clay"
              >
                {t("home.referHow")}
              </Link>
            </div>
          </div>
          <RevealGroup className="flex flex-col gap-3">
            {[
              ["1", t("home.ref1"), t("home.ref1Body")],
              ["2", t("home.ref2"), t("home.ref2Body")],
              ["3", t("home.ref3"), t("home.ref3Body")],
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
          eyebrow={t("home.featEyebrow")}
          title={t("home.featTitle")}
        />
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [ICON.calendar, t("home.f1"), t("home.f1Body")],
            [ICON.wallet, t("home.f2"), t("home.f2Body")],
            [ICON.receipt, t("dash.transactions"), t("home.f3Body")],
            [ICON.bell, t("home.f4"), t("home.f4Body")],
            [ICON.people, t("home.f5"), t("home.f5Body")],
            [ICON.globe, t("home.f6"), t("home.f6Body")],
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
            <SectionHeading eyebrow={t("home.faqEyebrow")} title={t("home.faqTitle")} />
            <Link href="/help" className="mt-6 inline-block text-sm font-medium text-clay hover:underline">
              {t("home.visitHelp")} →
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
              <p className="font-mono text-xs tracking-widest uppercase opacity-80">{t("home.appEyebrow")}</p>
              <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                {t("home.appTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed opacity-90">
                {t("home.appBody")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <StoreButton href={APP_LINKS.ios} store="App Store" kicker={t("home.appStoreKicker")} soon={t("home.appSoon")} />
                <StoreButton href={APP_LINKS.android} store="Google Play" kicker={t("home.playKicker")} soon={t("home.appSoon")} />
              </div>
            </div>
            <div className="hidden justify-center lg:flex">
              <div className="w-56 rotate-3 rounded-[2.5rem] border-[10px] border-black/80 bg-background p-4 text-foreground shadow-2xl">
                <p className="text-xs text-foreground/50">{t("dash.welcome")}</p>
                <p className="font-semibold">Ada Okafor</p>
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {[t("dash.meetings"), t("home.mockHistory"), t("dash.wallet")].map((label) => (
                    <div key={label} className="rounded-lg bg-clay/10 p-2 text-center text-[9px] font-medium text-clay">{label}</div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-line p-2.5">
                  <p className="text-[10px] font-medium">{t("notif.inspConfirmed.title")}</p>
                  <p className="text-[9px] text-foreground/50">{t("home.mockWhen")}</p>
                </div>
                <div className="mt-2 rounded-xl border border-line p-2.5">
                  <p className="text-[10px] font-medium">{t("home.mockAccepted")} 🎉</p>
                  <p className="text-[9px] text-foreground/50">{t("home.mockListing")}</p>
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
              {t("home.finalBody")}
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
            {t("home.photoCredits")}{" "}
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
            {t("home.photoCreditsNote")}
          </p>
        </div>
      </section>
    </div>
  );
}

function StoreButton({ href, store, kicker, soon }: { href?: string; store: string; kicker: string; soon: string }) {
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
        <span className="block text-[10px] opacity-80">{href ? kicker : soon}</span>
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
