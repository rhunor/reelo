import Link from "next/link";
import { auth } from "@/auth";
import { ContactMessageForm } from "@/components/contact-message-form";
import { SocialIcons } from "@/components/social-icons";
import { OFFICE_ADDRESS, OPENING_HOURS, SUPPORT_EMAIL, SUPPORT_PHONES } from "@/lib/contact-info";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Contact — Reallow" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const session = await auth();
  const { topic } = await searchParams;
  const t = await getT();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("contact.eyebrow")}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("contact.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/70">
        {t("contact.intro")}{" "}
        <Link href="/dashboard" className="underline">
          {t("contact.yourDashboard")}
        </Link>
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-3xl border border-line p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{t("contact.sendTitle")}</h2>
          <p className="mt-1 mb-5 text-sm text-foreground/60">{t("contact.replyTime")}</p>
          <ContactMessageForm signedIn={Boolean(session?.user)} initialTopic={topic} />
        </section>

        <aside className="flex flex-col gap-4 text-sm">
          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">{t("contact.office")}</p>
            <address className="mt-2 not-italic leading-relaxed">
              {OFFICE_ADDRESS.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a href={OFFICE_ADDRESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-clay underline">
              {t("contact.directions")}
            </a>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">{t("contact.hours")}</p>
            <dl className="mt-2 flex flex-col gap-1.5">
              {OPENING_HOURS.map((row) => (
                <div key={row.daysKey} className="flex justify-between gap-3">
                  <dt className="text-foreground/70">{t(row.daysKey)}</dt>
                  <dd className="text-right font-medium">{"hoursKey" in row ? t(row.hoursKey) : row.hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">{t("contact.callOrEmail")}</p>
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
            <p className="text-xs font-medium tracking-wide text-foreground/50 uppercase">{t("contact.follow")}</p>
            <div className="mt-3">
              <SocialIcons />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
