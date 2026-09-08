"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Something went wrong</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page hit a snag.</h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/70">
        That&apos;s usually temporary — try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
