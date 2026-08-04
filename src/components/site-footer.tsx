import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} RentDirect. Direct from landlord, itemised to the naira.</p>
        <div className="flex gap-6">
          <Link href="/listings" className="hover:text-clay">
            Listings
          </Link>
          <Link href="/pricing" className="hover:text-clay">
            Pricing
          </Link>
          <Link href="/dashboard/tenant/tickets/new" className="hover:text-clay">
            Contact Reelo
          </Link>
        </div>
      </div>
    </footer>
  );
}
