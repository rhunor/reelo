"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaqList } from "@/components/faq-list";
import { FAQ_TOPICS } from "@/lib/faqs";

const inputClass = "w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm";

export function ContactMessageForm({ signedIn, initialTopic }: { signedIn: boolean; initialTopic?: string }) {
  const router = useRouter();
  const [topic, setTopic] = useState(FAQ_TOPICS.some((t) => t.id === initialTopic) ? initialTopic! : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const selected = FAQ_TOPICS.find((t) => t.id === topic);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!topic) return setError("Choose a topic");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const subject = (formData.get("subject") as string)?.trim() || selected!.label;
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
    if (!res.ok) return setError(data?.error ?? "Couldn't send your message");

    if (signedIn && data?.id) {
      router.push(`/dashboard/tenant/tickets/${data.id}`);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-verified/40 bg-verified/5 p-6 text-center">
        <p className="font-medium text-verified">Message sent</p>
        <p className="mt-1 text-sm text-foreground/70">
          We&apos;ve emailed you a copy and will reply to your email as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Select a topic
        <select value={topic} onChange={(e) => setTopic(e.target.value)} required className={inputClass}>
          <option value="" disabled>
            What do you need help with?
          </option>
          {FAQ_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {selected && selected.faqs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">
            Common questions — your answer might be here
          </p>
          <FaqList faqs={selected.faqs} />
          <p className="mt-2 text-xs text-foreground/50">
            Still need help? Send us a message below.{" "}
            <Link href="/help" className="underline">
              Browse all help topics
            </Link>
          </p>
        </div>
      )}

      {!signedIn && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Your name" className={inputClass} />
          <input name="email" type="email" required placeholder="Email address" className={inputClass} />
          <input name="phone" type="tel" placeholder="Phone (optional)" className={inputClass + " sm:col-span-2"} />
        </div>
      )}
      {/* Honeypot — hidden from people, irresistible to bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <input name="subject" placeholder="Subject (optional)" maxLength={150} className={inputClass} />
      <textarea name="message" required minLength={5} rows={5} placeholder="How can we help?" className={inputClass} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-full bg-clay text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send message"}
      </button>
      <p className="text-center text-xs text-foreground/50">
        {signedIn
          ? "You'll get a copy by email, and a notification here and by email when we reply."
          : "You'll get a copy by email. Have an account? Log in so replies show in your notifications too."}
      </p>
    </form>
  );
}
