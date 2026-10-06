import Link from "next/link";
import { ObjectId } from "mongodb";
import { auth, signOut } from "@/auth";
import { ReallowLogo } from "@/components/reallow-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { LanguageSelect } from "@/components/language-select";
import { getCollections } from "@/lib/db";
import { getT } from "@/lib/i18n/server";

import { NotificationBell } from "@/components/notification-bell";
import { ProfileMenu } from "@/components/profile-menu";

// Staff roles each have their own workspace; everyone else (one account for renting,
// buying, letting, and selling) shares /dashboard. Never link staff to the bare
// /dashboard: it only redirects for them, and a Server Component that redirects
// mid-render during a client-side (RSC) transition hits a known App Router bug ("Rendered
// more hooks than during the previous render").
const STAFF_DASHBOARD_PATH: Record<string, string> = {
  admin: "/dashboard/admin",
  support: "/dashboard/support",
  staff: "/dashboard/staff",
};

async function logout() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function SiteHeader() {
  const session = await auth();
  const t = await getT();
  const dashboardHref = (session?.user?.role && STAFF_DASHBOARD_PATH[session.user.role]) || "/dashboard";

  // Best-effort — a hiccup here shouldn't take down the whole site's header.
  let unreadCount = 0;
  let pictureUrl: string | undefined;
  let name = session?.user?.name ?? "";
  if (session?.user) {
    try {
      const { notifications, users } = await getCollections();
      const userId = new ObjectId(session.user.id);
      const [count, user] = await Promise.all([
        notifications.countDocuments({ userId, read: false }),
        users.findOne({ _id: userId }, { projection: { name: 1, profile: 1 } }),
      ]);
      unreadCount = count;
      pictureUrl = user?.profile?.profilePictureUrl;
      name = user?.name ?? name;
    } catch {
      unreadCount = 0;
    }
  }

  const accountControls = session?.user ? (
    <>
      <NotificationBell initialUnread={unreadCount} />
      <ProfileMenu
        name={name}
        email={session.user.email ?? ""}
        pictureUrl={pictureUrl}
        dashboardHref={dashboardHref}
        logout={logout}
      />
    </>
  ) : null;

  // Confirmed top navigation: Home, Listings, About, Contact, Help.
  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/listings", label: t("nav.listings") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/help", label: t("nav.help") },
  ];

  const guestLinks = (
    <>
      <Link href="/login" className="hover:text-clay">
        {t("nav.login")}
      </Link>
      <Link
        href="/register?role=landlord"
        className="inline-flex items-center rounded-full bg-clay px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("nav.listProperty")}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <ReallowLogo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-clay">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 text-sm sm:flex">
          {session?.user ? (
            <Link href={dashboardHref} className="mr-1 hover:text-clay">
              {t("nav.dashboard")}
            </Link>
          ) : (
            guestLinks
          )}
          <LanguageSelect compact />
          <ThemeToggle />
          {accountControls}
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          {accountControls}
          <MobileNav>
            <LanguageSelect />
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-clay">
                {link.label}
              </Link>
            ))}
            {session?.user ? (
              <Link href={dashboardHref} className="hover:text-clay">
                {t("nav.dashboard")}
              </Link>
            ) : (
              guestLinks
            )}
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
