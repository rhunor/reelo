"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaqList } from "@/components/faq-list";
import { FAQ_TOPICS, topicLabel, translatedTopics } from "@/lib/faqs";
import { useI18n } from "@/components/i18n-provider";

const inputClass = "w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm";

export function ContactMessageForm({ signedIn, initialTopic }: { signedIn: boolean; initialTopic?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const topics = translatedTopics(t);
  const [topic, setTopic] = useState(FAQ_TOPICS.some((item) => item.id === initialTopic) ? initialTopic! : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const selected = topics.find((item) => item.id === topic);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!topic) return setError(t("contact.chooseTopic"));
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    // Subjects reach Reallow's team, so the default stays in English.
    const subject = (formData.get("subject") as string)?.trim() || topicLabel(topic) || selected!.label;
    const res = await fetch(signedIn ? "/api/tickets" : "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        subject,
        message: formData.get("message"),
        name: formData.get("name") || undefined,
        email: formData.get("email") || undefined,
        phone: formData.get("phone") || undefined,
        website: formData.get("website") || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) return setError(data?.error ?? t("contact.sendFailed"));

    if (signedIn && data?.id) {
      router.push(`/dashboard/tenant/tickets/${data.id}`);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-verified/40 bg-verified/5 p-6 text-center">
        <p className="font-medium text-verified">{t("contact.sent")}</p>
        <p className="mt-1 text-sm text-foreground/70">{t("contact.sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("contact.selectTopic")}
        <select value={topic} onChange={(e) => setTopic(e.target.value)} required className={inputClass}>
          <option value="" disabled>
            {t("contact.needHelpWith")}
          </option>
          {topics.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {selected && selected.faqs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">
            {t("contact.commonQuestions")}
          </p>
          <FaqList faqs={selected.faqs} />
          <p className="mt-2 text-xs text-foreground/50">
            {t("contact.stillNeedHelp")}{" "}
            <Link href="/help" className="underline">
              {t("contact.browseHelp")}
            </Link>
          </p>
        </div>
      )}

      {!signedIn && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="name" required placeholder={t("contact.yourName")} className={inputClass} />
          <input name="email" type="email" required placeholder={t("contact.emailAddress")} className={inputClass} />
          <input name="phone" type="tel" placeholder={t("contact.phoneOptional")} className={inputClass + " sm:col-span-2"} />
        </div>
      )}
      {/* Honeypot — hidden from people, irresistible to bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <input name="subject" placeholder={t("contact.subjectOptional")} maxLength={150} className={inputClass} />
      <textarea name="message" required minLength={5} rows={5} placeholder={t("contact.howHelp")} className={inputClass} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? t("common.sending") : t("contact.sendMessage")}
      </button>
      <p className="text-center text-xs text-foreground/50">
        {signedIn
          ? t("contact.footSignedIn")
          : t("contact.footGuest")}
      </p>
    </form>
  );
}
