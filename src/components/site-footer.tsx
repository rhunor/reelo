import Link from "next/link";

// Placeholder hrefs ("#") — swap these for Reallow's real social handles once you have
// them; not guessing at real URLs here.
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "X", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "LinkedIn", href: "#" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-foreground/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Reallow. Direct from landlord, itemised to the naira.</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/about" className="hover:text-clay">
              About
            </Link>
            <Link href="/listings" className="hover:text-clay">
              Listings
            </Link>
            <Link href="/dashboard/tenant/tickets/new" className="hover:text-clay">
              Contact Reallow
            </Link>
            <Link href="/terms" className="hover:text-clay">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-clay">
              Privacy
            </Link>
          </div>
        </div>
        <div className="flex gap-5 border-t border-line pt-4">
          {SOCIAL_LINKS.map((social) => (
            <a key={social.label} href={social.href} className="hover:text-clay">
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
