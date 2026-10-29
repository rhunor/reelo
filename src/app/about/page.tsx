import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { auth } from "@/auth";
import { ctaLinks } from "@/lib/cta-links";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const metadata = { title: "About — Reallow" };

// The About page is about Reallow itself — vision, mission, values, where we are — and
// deliberately doesn't repeat what the home page already explains (how it works, fees,
// safety). Words live in the translation files (about.*).
const VALUES = [
  { n: 1, icon: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  { n: 2, icon: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h4" },
  { n: 3, icon: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
] as const;

export default async function AboutPage() {
  const links = ctaLinks(await auth());
  const t = await getT();
  return (
    <div className="flex-1">
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("footer.aboutReallow")}</p>
          <h1 className="mt-4 text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">{t("about.heroTitle")}</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">{t("about.heroBody")}</p>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
            <Image
              src="/home/about-couple.jpg"
              alt="A Nigerian couple outside their home in Jos"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
              style={{ objectPosition: "45% 35%" }}
            />
          </div>
        </Reveal>
      </section>

      {/* Vision and mission */}
      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-16 md:grid-cols-2 lg:py-20">
          {(["vision", "mission"] as const).map((key, i) => (
            <Reveal key={key} delay={i * 0.1} className="rounded-3xl border border-line bg-background p-8 sm:p-10">
              <p className="font-mono text-xs tracking-widest text-clay uppercase">{t(`about.${key}Label` as MessageKey)}</p>
              <h2 className="mt-4 text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">{t(`about.${key}` as MessageKey)}</h2>
              <p className="mt-4 leading-relaxed text-foreground/70">{t(`about.${key}Body` as MessageKey)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.valuesEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t("about.valuesTitle")}</h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-3">
          {VALUES.map(({ n, icon }) => (
            <RevealItem key={n}>
              <div className="h-full rounded-3xl border border-line bg-background p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay/10 text-clay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d={icon} />
                  </svg>
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{t(`about.value${n}.title` as MessageKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{t(`about.value${n}.body` as MessageKey)}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Where we operate */}
      <section className="border-t border-line bg-foreground/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <Reveal>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl">
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Zuma_Rock.jpg"
                alt="Zuma Rock"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-xs text-foreground/40">{t("about.photoCredit")}</p>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("about.whereEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t("about.whereTitle")}</h2>
            <p className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{t("about.notYet")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-clay sm:text-3xl">{t("about.expanding")}</p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line">
        <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{t("about.readyTitle")}</h2>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70">{t("about.readyBody")}</p>
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
