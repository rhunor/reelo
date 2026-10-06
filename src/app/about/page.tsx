import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem, HoverLift, PulseDot } from "@/components/reveal";
import { auth } from "@/auth";
import { ctaLinks } from "@/lib/cta-links";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const metadata = { title: "About — Reallow" };

// Words for these live in the translation files (about.stepN.* / about.valueN.*).
const steps = ["01", "02", "03", "04"];
const values = [1, 2, 3];

export default async function AboutPage() {
  const links = ctaLinks(await auth());
  const t = await getT();
  return (
    <div className="flex-1">
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("footer.aboutReallow")}</p>
          <h1 className="mt-4 text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
            {t("about.heroTitle")}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            {t("about.heroBody")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            >
              {t("about.browse")}
            </Link>
            <Link
              href={links.listProperty}
              className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
            >
              {t("nav.listProperty")}
            </Link>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl">
            <Image
              src="https://picsum.photos/seed/reallow-about-hero/1000/1250"
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-foreground/60">
            <PulseDot className="h-2 w-2 rounded-full bg-verified" />
            {t("about.verifiedNote")}
          </div>
        </Reveal>
      </section>

      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <Reveal direction="right">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl lg:order-2">
              <Image
                src="https://picsum.photos/seed/reallow-about-story/900/700"
                alt=""
                fill
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal className="lg:order-1">
            <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.whyEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {t("about.whyTitle")}
            </h2>
            <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-foreground/80">
              <p>
                {t("about.why1")}
              </p>
              <p>
                {t("about.why2")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("home.howEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {t("about.howTitle")}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-2">
          {steps.map((step) => (
            <RevealItem key={step}>
              <HoverLift className="h-full rounded-2xl border border-line bg-background p-6">
                <span className="font-mono text-sm text-clay">{step}</span>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                  {t(`about.step${Number(step)}.title` as MessageKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                  {t(`about.step${Number(step)}.body` as MessageKey)}
                </p>
              </HoverLift>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <Reveal className="rounded-2xl border border-line bg-background p-8">
              <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.tenantsEyebrow")}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {t("about.tenantsTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                {t("about.tenantsBody")}
              </p>
            </Reveal>
            <Reveal delay={0.1} className="rounded-2xl border border-line bg-background p-8">
              <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.ownersEyebrow")}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {t("about.ownersTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                {t("about.ownersBody")}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.valuesEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {t("about.valuesTitle")}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-3">
          {values.map((value) => (
            <RevealItem key={value}>
              <div className="h-full rounded-2xl border border-line bg-background p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {t(`about.value${value}.title` as MessageKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                  {t(`about.value${value}.body` as MessageKey)}
                </p>
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
                alt="Zuma Rock"
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-xs text-foreground/40">
              {t("about.photoCredit")}
            </p>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.whereEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {t("about.whereTitle")}
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-foreground/80">
              {t("about.whereBody")}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center lg:py-28">
          <Reveal>
            <p className="text-3xl font-semibold tracking-tight sm:text-5xl">
              {t("about.notYet")}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-clay sm:text-5xl">
              {t("about.expanding")}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line">
        <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{t("about.readyTitle")}</h2>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70">
            {t("about.readyBody")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            >
              {t("about.browse")}
            </Link>
            <Link
              href={links.listProperty}
              className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
            >
              {t("nav.listProperty")}
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
