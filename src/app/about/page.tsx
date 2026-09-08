import Link from "next/link";

export const metadata = { title: "About — Reallow" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">About Reallow</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Finding a home shouldn&apos;t feel like a second job.
      </h1>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <p>
          Reallow connects tenants and landlords directly — no agent standing between you, no
          runaround, no guesswork about what you&apos;re actually getting into. What you see is
          what you get, and what you&apos;re quoted is what you pay.
        </p>
        <p>
          We handle the parts that usually make renting stressful: verifying every landlord and
          every listing in person before it ever goes live, coordinating every inquiry and
          inspection so nothing falls through the cracks, drafting the tenancy agreement, and
          collecting payments into one place with a clear, itemised breakdown before you commit
          to anything.
        </p>
        <p>
          For landlords, Reallow means faster, better-matched tenants — verified, serious, and
          ready to move — without the cost or hassle of managing inquiries yourself.
        </p>
        <p>
          Reallow currently operates in <strong>Abuja</strong>. Not in your city yet? We&apos;re
          expanding — hang tight.
        </p>
      </div>

      <div className="mt-10 flex gap-4">
        <Link
          href="/listings"
          className="flex h-11 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90"
        >
          Browse listings
        </Link>
        <Link
          href="/register"
          className="flex h-11 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
        >
          List your property
        </Link>
      </div>
    </div>
  );
}
