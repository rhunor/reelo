import { CookieSettingsLink } from "@/components/cookie-settings-link";
import { ANALYTICS_RETENTION_S, CONSENT_COOKIE, SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/consent";

export const metadata = { title: "Cookie Policy — Reallow" };

const RETENTION_MONTHS = Math.round(ANALYTICS_RETENTION_S / (30 * 24 * 3600));

const ESSENTIAL = [
  ["authjs.session-token", "Keeps you signed in to your account.", "Until you sign out (up to 30 days)"],
  ["authjs.csrf-token, authjs.callback-url", "Protects sign-in forms from forgery and returns you to the right page.", "Session"],
  ["reallow-lang", "Remembers the language you chose.", "1 year"],
  [CONSENT_COOKIE, "Remembers your answer to this cookie notice.", "1 year"],
] as const;

const ANALYTICS = [
  [VISITOR_COOKIE, "A random ID that lets us count unique visitors without knowing who you are.", "1 year"],
  [SESSION_COOKIE, "A random ID that groups the pages you view in one visit.", "30 minutes of inactivity"],
] as const;

function CookieTable({ rows }: { rows: readonly (readonly [string, string, string])[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-xs">
        <thead className="bg-foreground/5 text-foreground/60">
          <tr>
            <th className="px-3 py-2 font-medium">Cookie</th>
            <th className="px-3 py-2 font-medium">What it does</th>
            <th className="px-3 py-2 font-medium">How long</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([name, purpose, duration]) => (
            <tr key={name}>
              <td className="px-3 py-2 font-mono whitespace-nowrap">{name}</td>
              <td className="px-3 py-2">{purpose}</td>
              <td className="px-3 py-2 whitespace-nowrap">{duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Cookie Policy</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: October 8, 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">What cookies are</h2>
          <p className="mt-2">
            Cookies are small text files a website stores in your browser. Reallow uses a few of
            its own — we don&apos;t use advertising cookies, and we don&apos;t let other companies
            track you on our site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Essential cookies — always on</h2>
          <p className="mt-2">
            These are needed for Reallow to work at all, so they don&apos;t need your consent.
          </p>
          <CookieTable rows={ESSENTIAL} />
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Analytics cookies — only if you accept</h2>
          <p className="mt-2">
            If you choose &quot;Accept all&quot;, Reallow records the pages you visit so we can
            see which parts of the site people use and fix what isn&apos;t working. For each page
            view we keep: the page, the date and time, how you arrived (for example Google,
            Facebook, a WhatsApp link, or a campaign link), your device type and browser, your
            approximate location (city and country, worked out by our hosting provider — we
            never store your IP address), and, if you&apos;re signed in, your account.
          </p>
          <CookieTable rows={ANALYTICS} />
          <p className="mt-3">
            This information is only seen by Reallow staff, is never sold or shared for
            advertising, and is deleted automatically after {RETENTION_MONTHS} months. If you choose
            &quot;Essential only&quot;, none of it is collected.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Other storage</h2>
          <p className="mt-2">
            Your light/dark theme choice is saved in your browser&apos;s local storage, not a
            cookie, and never leaves your device. Payments happen on Paystack&apos;s secure
            page, which uses its own cookies under Paystack&apos;s policy.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Changing your choice</h2>
          <p className="mt-2">
            You can change your mind at any time —{" "}
            <span className="text-clay underline">
              <CookieSettingsLink label="open cookie settings" />
            </span>{" "}
            (also in the footer of every page). You can also delete cookies in your browser&apos;s
            settings; you&apos;ll then be asked again on your next visit.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about cookies or your data can be sent through the{" "}
            <a href="/contact" className="underline">Contact</a> page. See also our{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
