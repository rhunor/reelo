"use client";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-9 rounded-full border border-line px-4 text-sm font-medium print:hidden"
    >
      {label}
    </button>
  );
}
