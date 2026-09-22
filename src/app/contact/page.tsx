import Link from "next/link";
import { SOCIAL_LINKS } from "@/lib/social-links";

export const metadata = { title: "Contact — Reallow" };

const SUPPORT_EMAIL = "reallowng@gmail.com";
const SUPPORT_PHONES = ["08104669006", "09067487805"];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-clay uppercase">Get in touch</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Contact Reallow</h1>
      <p className="mt-4 text-sm leading-relaxed text-foreground/70">
        For anything tied to a specific listing, application, or inspection, use the{" "}
        <Link href="/dashboard" className="underline">
          Contact Reallow
        </Link>{" "}
        option in your dashboard — it keeps your conversation attached to the right context.
        For everything else, reach us directly:
      </p>

      <div className="mt-8 flex flex-col gap-4 text-sm">
        <div className="rounded-lg border border-line p-4">
          <p className="font-medium">Email</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 inline-block text-clay underline">
            {SUPPORT_EMAIL}
          </a>
        </div>
        <div className="rounded-lg border border-line p-4">
          <p className="font-medium">Phone</p>
          <div className="mt-1 flex flex-col gap-1">
            {SUPPORT_PHONES.map((phone) => (
              <a key={phone} href={`tel:${phone}`} className="inline-block text-clay underline">
                {phone}
              </a>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line p-4">
          <p className="font-medium">Hours</p>
          <p className="mt-1 text-foreground/70">Weekdays, 8am–6pm (WAT)</p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-medium">Follow Reallow</p>
        <div className="mt-2 flex gap-5 text-sm">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-clay hover:underline"
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
