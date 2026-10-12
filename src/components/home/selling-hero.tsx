"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { PulseDot } from "@/components/reveal";
import { useI18n } from "@/components/i18n-provider";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// How long each floating notification stays before the next one replaces it.
const CARD_MS = 3200;

// The first thing on the home page: someone getting good news on their phone. The photo
// drifts slowly (a "Ken Burns" pan/zoom) and phone notifications float up beside it in turn,
// so the picture feels alive without being a video. Everything stays still for visitors who
// ask their device for reduced motion.
export function SellingHero({ listPropertyHref }: { listPropertyHref: string }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const cards = [
    { icon: "🎉", title: t("home.sellCard1"), sub: t("home.sellCard1Sub") },
    { icon: "📅", title: t("home.sellCard2"), sub: t("home.sellCard2Sub") },
    { icon: "✓", title: t("home.sellCard3"), sub: t("home.sellCard3Sub") },
  ];
  const [card, setCard] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setCard((c) => (c + 1) % cards.length), CARD_MS);
    return () => clearInterval(timer);
  }, [reduceMotion, cards.length]);

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-16 lg:pb-20">
        <motion.div initial="hidden" animate="show" variants={reduceMotion ? undefined : container}>
          <motion.p variants={reduceMotion ? undefined : rise} className="font-mono text-xs tracking-widest text-clay uppercase">
            Abuja · Port Harcourt · Warri
          </motion.p>
          <motion.h1
            variants={reduceMotion ? undefined : rise}
            className="mt-4 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl"
          >
            {t("home.sellTitle1")}
            <br />
            <span className="text-clay">{t("home.sellTitle2")}</span>
          </motion.h1>
          <motion.p variants={reduceMotion ? undefined : rise} className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            {t("home.sellBody")}
          </motion.p>
          <motion.div variants={reduceMotion ? undefined : rise} className="mt-8 flex flex-wrap gap-4">
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
        </motion.div>

        <motion.div
          className="relative"
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-2xl sm:aspect-[5/4]">
            {/* Slow, endless drift — the "moving photo" effect. */}
            <motion.div
              className="absolute inset-0"
              animate={reduceMotion ? undefined : { scale: [1.04, 1.14, 1.04], x: ["0%", "-3%", "0%"], y: ["0%", "-2%", "0%"] }}
              transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
            >
              <Image
                src="/home/hero-phone.jpg"
                alt="A man in his workshop smiling and celebrating as he reads good news on his phone"
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
                style={{ objectPosition: "45% 35%" }}
              />
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>

          {/* Notifications popping up, one after another. */}
          <div className="absolute right-3 bottom-4 left-3 sm:right-auto sm:-left-6 sm:bottom-8 sm:w-72" aria-live="off">
            <AnimatePresence mode="wait">
              <motion.div
                key={card}
                initial={reduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.92 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: [0, -6, 0], scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -16, scale: 0.96 }}
                transition={{
                  opacity: { duration: 0.35 },
                  scale: { type: "spring", stiffness: 300, damping: 20 },
                  y: { duration: 2.4, ease: "easeInOut", repeat: Infinity },
                }}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-xl backdrop-blur"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay/10 text-lg text-clay">
                  {cards[card]!.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{cards[card]!.title}</span>
                  <span className="block truncate text-xs text-foreground/60">{cards[card]!.sub}</span>
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-surface/95 px-3.5 py-1.5 text-xs font-medium shadow-lg backdrop-blur">
            <PulseDot className="h-2 w-2 rounded-full bg-verified" />
            {t("home.sellLive")}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
