import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { SocialIcons } from "@/components/social-icons";
import { translatedTopics } from "@/lib/faqs";
import { getT } from "@/lib/i18n/server";
import { SUPPORT_PHONES } from "@/lib/contact-info";

export const metadata = { title: "Help — Reallow" };

export default async function HelpPage() {
  const t = await getT();
  const topics = translatedTopics(t).filter((topic) => topic.faqs.length > 0);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">{t("footer.helpCentre")}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("help.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-foreground/70">
        {t("help.intro")}{" "}
        <Link href="/contact" className="underline">
          {t("footer.contactUs")}
        </Link>
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <a
            key={topic.id}
            href={`#${topic.id}`}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-clay hover:text-clay"
          >
            {topic.label}
          </a>
        ))}
      </nav>

      <div className="mt-10 flex flex-col gap-10">
        {topics.map((topic) => (
          <section key={topic.id} id={topic.id} className="scroll-mt-24">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{topic.label}</h2>
              <Link href={`/contact?topic=${topic.id}`} className="shrink-0 text-xs text-clay hover:underline">
                {t("help.askAboutThis")} →
              </Link>
            </div>
            <FaqList faqs={topic.faqs} />
          </section>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-clay/[0.07] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{t("help.stillStuck")}</p>
          <p className="mt-1 text-sm text-foreground/70">
            {t("help.stillStuckBody", { phone: SUPPORT_PHONES[0]! })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/contact" className="flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white">
            {t("footer.contactUs")}
          </Link>
          <SocialIcons size="sm" />
        </div>
      </div>
    </div>
  );
}
