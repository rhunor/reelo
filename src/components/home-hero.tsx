"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PulseDot } from "@/components/reveal";
import { useI18n } from "@/components/i18n-provider";

const EASE = [0.22, 1, 0.36, 1] as const;

// Every element below plays on mount — not scroll-triggered — so it replays in full on
// every page load/refresh, exactly like a splash entrance rather than a scroll effect.
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

// Each text element gets its own distinct motion, on purpose — a uniform fade for
// everything reads as one animation; a slightly different move per line reads as several.
const dropIn: Variants = {
  hidden: { opacity: 0, y: -28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const hop: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.86 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 16 } },
};

export function HomeHero({ listPropertyHref = "/register?role=landlord" }: { listPropertyHref?: string }) {
  const reduceMotion = useReducedMotion();
  const { t } = useI18n();

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-20 lg:pb-24">
      <motion.div initial="hidden" animate="show" variants={reduceMotion ? undefined : container}>
        <motion.p
          variants={reduceMotion ? undefined : dropIn}
          className="font-mono text-xs tracking-widest text-clay uppercase"
        >
          Abuja · Port Harcourt · Warri
        </motion.p>
        <motion.h1
          variants={reduceMotion ? undefined : hop}
          className="mt-4 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl"
        >
          {t("home.heroTitle1")}
          <br />
          <span className="text-clay">{t("home.heroTitle2")}</span>
        </motion.h1>
        <motion.p
          variants={reduceMotion ? undefined : fadeUp}
          className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70"
        >
          {t("home.heroBody")}
        </motion.p>

        <motion.div variants={reduceMotion ? undefined : popIn} className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/listings"
            className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
          >
            {t("home.ctaFind")}
          </Link>
          <Link
            href={listPropertyHref}
            className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
          >
            {t("home.ctaList")}
          </Link>
        </motion.div>

        <motion.ul
          variants={reduceMotion ? undefined : fadeUp}
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/70"
        >
          {[t("home.point1"), t("home.point2"), t("home.point3")].map((point) => (
            <li key={point} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-verified/15 text-[11px] text-verified">✓</span>
              {point}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <div className="overflow-hidden p-2">
        <motion.div
          className="relative"
          initial={reduceMotion ? undefined : { opacity: 0, x: 260, rotate: 2 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.15 }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl sm:aspect-4/5">
            <Image
              src="https://images.unsplash.com/photo-1757970326337-95d7cca56fa1?q=80&w=1400&auto=format&fit=crop"
              alt="Modern apartment building with balconies, the kind of verified listing found on Reallow"
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="absolute top-6 left-6 flex items-center gap-2 rounded-full bg-surface px-4 py-2 shadow-lg">
            <PulseDot className="h-2 w-2 rounded-full bg-verified" />
            <span className="text-sm font-medium">{t("home.verifiedByReallow")}</span>
          </div>

        </motion.div>
      </div>
    </section>
  );
}
