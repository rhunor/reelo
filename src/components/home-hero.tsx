"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PulseDot } from "@/components/reveal";

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

export function HomeHero() {
  const reduceMotion = useReducedMotion();

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
          Rent or buy a verified home.
          <br />
          <span className="text-clay">No agent. No surprises.</span>
        </motion.h1>
        <motion.p
          variants={reduceMotion ? undefined : fadeUp}
          className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70"
        >
          Every property on Reallow is inspected in person and every landlord is identity-checked.
          You see the full cost — to the naira — before you pay, and your money is held safely by
          Reallow until you get your keys.
        </motion.p>

        <motion.div variants={reduceMotion ? undefined : popIn} className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/listings"
            className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
          >
            Find a home
          </Link>
          <Link
            href="/register?role=landlord"
            className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
          >
            List your property — free
          </Link>
        </motion.div>

        <motion.ul
          variants={reduceMotion ? undefined : fadeUp}
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/70"
        >
          {["Inspected in person", "NIN & BVN verified", "Every naira itemised"].map((point) => (
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
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl">
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
            <span className="text-sm font-medium">Verified by Reallow</span>
          </div>
          <div className="absolute right-4 bottom-4 left-4 rounded-2xl bg-surface/95 p-4 shadow-xl backdrop-blur sm:right-6 sm:bottom-6 sm:left-auto sm:w-72">
            <p className="text-xs text-foreground/50">2-bedroom flat · Effurun</p>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><dt className="text-foreground/60">Rent</dt><dd className="font-mono">₦900,000</dd></div>
              <div className="flex justify-between"><dt className="text-foreground/60">Caution fee</dt><dd className="font-mono">₦100,000</dd></div>
              <div className="flex justify-between"><dt className="text-foreground/60">Service charge (10%)</dt><dd className="font-mono">₦90,000</dd></div>
              <div className="mt-1 flex justify-between border-t border-line pt-1.5 font-semibold"><dt>Total</dt><dd className="font-mono">₦1,090,000</dd></div>
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
