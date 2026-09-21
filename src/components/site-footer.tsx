import Link from "next/link";
import { auth } from "@/auth";
import { SOCIAL_LINKS } from "@/lib/social-links";

// Landlords clicking the footer's "Contact Reallow" used to get bounced — it was
// hardcoded to the tenant-only ticket route, which the proxy's role gate silently
// redirects anyone else away from. Route each role to the ticket form it actually has.
const CONTACT_HREF_BY_ROLE: Record<string, string> = {
  tenant: "/dashboard/tenant/tickets/new",
  landlord: "/dashboard/landlord/tickets/new",
};

export async function SiteFooter() {
  const session = await auth();
  const contactHref = (session?.user?.role && CONTACT_HREF_BY_ROLE[session.user.role]) || "/login";

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
            <Link href={contactHref} className="hover:text-clay">
              Contact Reallow
            </Link>
            <Link href="/contact" className="hover:text-clay">
              Contact info
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
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-clay"
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
