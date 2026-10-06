import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { CompleteProfileForm } from "@/components/complete-profile-form";
import { ChangePasswordForm, ContactSettingsForm } from "@/components/account-settings-forms";
import { LanguageSelect } from "@/components/language-select";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const SECTIONS: { id: string; label: MessageKey }[] = [
  { id: "profile", label: "settings.profile" },
  { id: "contact", label: "settings.contact" },
  { id: "security", label: "settings.security" },
  { id: "language", label: "settings.language" },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getT();
  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-clay">
        ← {t("nav.dashboard")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[180px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:sticky md:top-24 md:flex-col md:self-start">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            >
              {t(section.label)}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-8">
          <section id="profile" className="scroll-mt-24 rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{t("dash.completeProfile")}</h2>
            <p className="mt-1 text-sm text-foreground/60">
              {t("settings.profileIntro")}{" "}
              <a href="/privacy" className="underline">
                {t("footer.privacy")}
              </a>
            </p>
            <CompleteProfileForm user={user} />
          </section>

          <section id="contact" className="scroll-mt-24 rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{t("settings.contactTitle")}</h2>
            <p className="mt-1 mb-5 text-sm text-foreground/60">{t("settings.contactIntro")}</p>
            <ContactSettingsForm
              email={user.email}
              phone={user.phone}
              alternatePhone={user.alternatePhone}
              emailVerified={user.emailVerified}
            />
          </section>

          <section id="security" className="scroll-mt-24 rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{t("settings.security")}</h2>
            <p className="mt-1 mb-5 text-sm text-foreground/60">{t("settings.securityIntro")}</p>
            <ChangePasswordForm />
          </section>

          <section id="language" className="scroll-mt-24 rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{t("settings.language")}</h2>
            <p className="mt-1 mb-4 text-sm text-foreground/60">{t("settings.languageHint")}</p>
            <LanguageSelect />
          </section>
        </div>
      </div>
    </div>
  );
}
