import Link from "next/link";
import { auth } from "@/auth";
import { ContactMessageForm } from "@/components/contact-message-form";
import { SocialIcons } from "@/components/social-icons";
import { OFFICE_ADDRESS, OPENING_HOURS, SUPPORT_EMAIL, SUPPORT_PHONES } from "@/lib/contact-info";

export const metadata = { title: "Contact — Reallow" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const session = await auth();
  const { topic } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Get in touch</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Contact Reallow</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/70">
        Pick a topic to see quick answers, or send us a message. For anything about a specific listing, application,
        or inspection, apply from the listing or use{" "}
        <Link href="/dashboard" className="underline">
          your dashboard
        </Link>{" "}
        so the conversation stays attached to it.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-3xl border border-line p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Send us a message</h2>
          <p className="mt-1 mb-5 text-sm text-foreground/60">We usually reply within one working day.</p>
          <ContactMessageForm signedIn={Boolean(session?.user)} initialTopic={topic} />
        </section>

        <aside className="flex flex-col gap-4 text-sm">
          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">Office</p>
            <address className="mt-2 not-italic leading-relaxed">
              {OFFICE_ADDRESS.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a href={OFFICE_ADDRESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-clay underline">
              Get directions
            </a>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">Opening hours (WAT)</p>
            <dl className="mt-2 flex flex-col gap-1.5">
              {OPENING_HOURS.map((row) => (
                <div key={row.days} className="flex justify-between gap-3">
                  <dt className="text-foreground/70">{row.days}</dt>
                  <dd className="text-right font-medium">{row.hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">Call or email</p>
            <div className="mt-2 flex flex-col gap-1">
              {SUPPORT_PHONES.map((phone) => (
                <a key={phone} href={`tel:${phone}`} className="text-clay underline">
                  {phone}
                </a>
              ))}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 text-clay underline">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">Follow Reallow</p>
            <div className="mt-3">
              <SocialIcons />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
