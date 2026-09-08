import Link from "next/link";
import type { ReactNode } from "react";

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  badge,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="font-mono text-xs tracking-widest text-clay uppercase">{eyebrow}</p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-foreground/70">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string | number; accent?: "clay" | "verified" | "amber" }[];
}) {
  const accentClass = {
    clay: "text-clay",
    verified: "text-verified",
    amber: "text-amber-600",
  } as const;

  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-line bg-background p-4">
          <p
            className={`text-2xl font-semibold tabular-nums ${stat.accent ? accentClass[stat.accent] : "text-foreground"}`}
          >
            {stat.value}
          </p>
          <p className="mt-1 text-xs text-foreground/60">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function QuickLinks({
  links,
}: {
  links: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            link.primary
              ? "flex h-9 items-center rounded-full bg-clay px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              : "flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium transition-colors hover:border-clay hover:text-clay"
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function AccountSettingsLink() {
  return (
    <Link
      href="/dashboard/complete-profile"
      className="flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium transition-colors hover:border-clay hover:text-clay"
    >
      Account settings
    </Link>
  );
}
