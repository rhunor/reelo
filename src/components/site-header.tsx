import Link from "next/link";
import { ObjectId } from "mongodb";
import { auth, signOut } from "@/auth";
import { ReallowLogo } from "@/components/reallow-logo";
import { getCollections } from "@/lib/db";

export async function SiteHeader() {
  const session = await auth();

  // Best-effort — a notification-count hiccup shouldn't take down the whole site's header.
  let unreadCount = 0;
  if (session?.user?.role === "tenant") {
    try {
      const { notifications } = await getCollections();
      unreadCount = await notifications.countDocuments({
        userId: new ObjectId(session.user.id),
        read: false,
      });
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <ReallowLogo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm sm:flex">
          <Link href="/listings" className="hover:text-clay">
            Listings
          </Link>
          <Link href="/pricing" className="hover:text-clay">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              {session.user.role === "tenant" && (
                <Link href="/dashboard/tenant/notifications" className="relative hover:text-clay">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-medium text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <Link href="/dashboard" className="hover:text-clay">
                Dashboard
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-foreground/60 hover:text-clay">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-clay">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-clay px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
              >
                List your property
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
