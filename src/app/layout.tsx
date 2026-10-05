import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageTransition } from "@/components/page-transition";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/lib/i18n/server";
import { LOCALES, clientMessages } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Reallow",
  description:
    "Rent direct from verified landlords in Abuja — transparent, itemised, no traditional agent.",
};

// Runs before hydration so an explicit theme choice applies before first paint —
// without this, the page would flash the system/light theme for a beat on every load.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("reallow-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const htmlLang = LOCALES.find((l) => l.code === locale)?.htmlLang ?? "en";

  return (
    <html lang={htmlLang} className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider locale={locale} messages={clientMessages(locale)}>
          <SiteHeader />
          <main className="flex flex-1 flex-col">
            <PageTransition>{children}</PageTransition>
          </main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
