import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          RentDirect
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
