import Image from "next/image";
import Link from "next/link";
import { FeeLedger } from "@/components/fee-ledger";

export default function Home() {
  return (
    <div className="flex-1">
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="font-mono text-xs tracking-widest text-clay uppercase">
            No agent. No hidden fees.
          </p>
          <h1 className="mt-4 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Reallow.
            <br />
            Rent direct, pay what&apos;s on the receipt.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            Reallow connects you straight to verified landlords across Lagos and Abuja — no
            agent commission, no surprise legal fee, no inspection charge. Search, message, sign,
            and pay, all itemised before you commit.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90"
            >
              Browse listings
            </Link>
            <Link
              href="/pricing"
              className="flex h-12 items-center justify-center rounded-full border border-line px-6 font-medium transition-colors hover:border-clay hover:text-clay"
            >
              See pricing
            </Link>
          </div>

          <div className="mt-10">
            <FeeLedger />
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl">
            <Image
              src="https://images.unsplash.com/photo-1757970326337-95d7cca56fa1?q=80&w=1400&auto=format&fit=crop"
              alt="Modern apartment building with balconies, the kind of verified listing found on Reallow"
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full bg-background px-4 py-2 shadow-lg">
            <span className="h-2 w-2 rounded-full bg-verified" />
            <span className="text-sm font-medium">Verified landlord</span>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-clay/5">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3">
          <div>
            <p className="font-display text-3xl font-semibold">NIN-verified</p>
            <p className="mt-2 text-sm text-foreground/70">
              Every landlord is identity-checked before a listing goes live — a real in-person
              inspection, not a rubber stamp.
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold">Digital agreement</p>
            <p className="mt-2 text-sm text-foreground/70">
              A standardised tenancy agreement with e-signature, included — no separate lawyer
              fee for a copy-paste template.
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold">Real support</p>
            <p className="mt-2 text-sm text-foreground/70">
              A direct line to Reallow for every inquiry, inspection, and dispute — not just an
              inbox that goes quiet.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
