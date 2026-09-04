"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "left" | "right";

// Transform-only (opacity + x/y), never width/height — animates on the compositor thread,
// so it stays smooth even on mobile and never triggers layout/reflow.
function offsetFor(direction: Direction, distance: number) {
  if (direction === "left") return { x: -distance, y: 0 };
  if (direction === "right") return { x: distance, y: 0 };
  return { x: 0, y: distance };
}

const EASE = [0.22, 1, 0.36, 1] as const;

// prefers-reduced-motion means "avoid large/vestibular-triggering movement," not "no
// animation at all" — so reduced motion drops the slide distance to ~0 and keeps a quick
// opacity fade, rather than disabling the effect outright (which made it look like nothing
// had shipped at all for anyone with that OS setting on).
export function Reveal({
  children,
  delay = 0,
  distance = 28,
  direction = "up",
  className,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  direction?: Direction;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const offset = offsetFor(direction, reduceMotion ? 0 : distance);

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduceMotion ? 0.25 : 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduceMotion ? 0.02 : stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  direction = "up",
  distance = 20,
}: {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  distance?: number;
}) {
  const reduceMotion = useReducedMotion();
  const offset = offsetFor(direction, reduceMotion ? 0 : distance);

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...offset },
        show: { opacity: 1, x: 0, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

// Continuously-looping pulse — unlike Reveal/HoverLift, this never depends on scrolling,
// hovering, or catching the right half-second after page load, so it's a reliable visual
// check for "is any animation running at all."
export function PulseDot({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={className}
      animate={reduceMotion ? { opacity: [1, 0.5, 1] } : { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// Lift-on-hover/press wrapper for cards and tappable tiles — a small, tactile affordance.
// Scale/translate only, so it's cheap and doesn't fight the card's own layout.
export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={{ y: reduceMotion ? 0 : -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
