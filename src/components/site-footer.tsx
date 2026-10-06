import Link from "next/link";
import { auth } from "@/auth";
import { ReallowFullLogo } from "@/components/reallow-logo";
import { SocialIcons } from "@/components/social-icons";
import { OFFICE_ADDRESS, OPENING_HOURS, SUPPORT_PHONES } from "@/lib/contact-info";
import { isStaffRole } from "@/lib/roles";
import { ctaLinks } from "@/lib/cta-links";
import { getT } from "@/lib/i18n/server";

export async function SiteFooter() {
  const session = await auth();
  const t = await getT();
  // Signed-in customers message Reallow from their account so replies show up in their
  // notifications; everyone else uses the public contact form.
  const messageHref =
    session?.user && !isStaffRole(session.user.role) ? "/dashboard/tenant/tickets/new" : "/contact";

  const columns = [
    {
      title: t("footer.explore"),
      links: [
        { href: "/", label: t("nav.home") },
        { href: "/listings", label: t("nav.listings") },
        { href: "/about", label: t("footer.aboutReallow") },
        { href: ctaLinks(session).listProperty, label: t("nav.listProperty") },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { href: "/help", label: t("footer.helpCentre") },
        { href: "/contact", label: t("footer.contactUs") },
        { href: messageHref, label: t("dash.messages") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/terms", label: t("footer.terms") },
        { href: "/privacy", label: t("footer.privacy") },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-line bg-foreground/[0.02] print:hidden">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)_1.3fr]">
          <div className="flex flex-col gap-4">
            <Link href="/" aria-label={t("footer.logoLabel")} className="w-fit">
              <ReallowFullLogo className="h-9 w-auto text-foreground" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-foreground/60">
              {t("footer.tagline")}
            </p>
            <SocialIcons size="sm" />
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">{column.title}</p>
              <ul className="mt-3 flex flex-col gap-2.5 text-sm text-foreground/60">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-clay">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="text-sm text-foreground/60">
            <p className="text-xs font-semibold tracking-wide text-foreground uppercase">{t("footer.visitUs")}</p>
            <address className="mt-3 not-italic leading-relaxed">
              {OFFICE_ADDRESS.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <p className="mt-3">
              {t(OPENING_HOURS[0].daysKey)}, {OPENING_HOURS[0].hours}
            </p>
            <a href={`tel:${SUPPORT_PHONES[0]}`} className="mt-1 inline-block hover:text-clay">
              {SUPPORT_PHONES[0]}
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
