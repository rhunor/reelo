"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatLagos } from "@/lib/time";
import type { LedgerEntry } from "@/lib/dashboard-data";

export function TransactionsPanel({ entries }: { entries: LedgerEntry[] }) {
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        order === "newest" ? +new Date(b.at) - +new Date(a.at) : +new Date(a.at) - +new Date(b.at),
      ),
    [entries, order],
  );

  const totalIn = entries.filter((e) => e.direction === "in").reduce((sum, e) => sum + e.amountNGN, 0);
  const totalOut = entries.filter((e) => e.direction === "out").reduce((sum, e) => sum + e.amountNGN, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-verified/10 p-3">
          <p className="text-xs text-foreground/60">Money in</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-verified">₦{totalIn.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-foreground/5 p-3">
          <p className="text-xs text-foreground/60">Money out</p>
          <p className="mt-0.5 font-mono text-lg font-semibold">₦{totalOut.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {entries.length} transaction{entries.length === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2 text-xs text-foreground/60">
          Sort
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as "newest" | "oldest")}
            className="h-8 rounded-md border border-line bg-transparent px-2 text-xs text-foreground"
          >
            <option value="newest">Most recent first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl bg-foreground/5 p-6 text-center text-sm text-foreground/50">No transactions yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {sorted.map((entry) => {
            const content = (
              <>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                    entry.direction === "in" ? "bg-verified/10 text-verified" : "bg-foreground/5 text-foreground/60"
                  }`}
                  aria-hidden
                >
                  {entry.direction === "in" ? "↓" : "↑"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{entry.label}</span>
                  {entry.detail && <span className="block truncate text-xs text-foreground/50">{entry.detail}</span>}
                  <span className="block text-[11px] text-foreground/40">
                    {formatLagos(entry.at)} · {entry.status}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-mono text-sm font-medium ${entry.direction === "in" ? "text-verified" : ""}`}
                >
                  {entry.direction === "in" ? "+" : "−"}₦{entry.amountNGN.toLocaleString()}
                </span>
              </>
            );
            return (
              <li key={`${entry.label}-${entry.id}`}>
                {entry.href ? (
                  <Link href={entry.href} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5">
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
