"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailAudience } from "@/types/models";

type Audience = { id: EmailAudience; label: string; hint: string };
const inputClass = "w-full rounded-lg border border-line bg-transparent px-3 py-2.5 text-sm focus:border-clay focus:outline-none";

// Admin → Email users: write once, send a test to yourself, then send to an audience.
export function EmailCampaignForm({ audiences }: { audiences: Audience[] }) {
  const router = useRouter();
  const [audience, setAudience] = useState<EmailAudience>("newsletter");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // The count is stored with the audience it was fetched for, so switching audience shows
  // "Counting…" until the new number arrives.
  const [counted, setCounted] = useState<{ key: string; count: number | null } | null>(null);
  const countKey = `${audience}:${verifiedOnly}`;
  const count = counted?.key === countKey ? counted.count : null;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/admin/email-campaigns?audience=${audience}&verifiedOnly=${verifiedOnly ? 1 : 0}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setCounted({ key: countKey, count: typeof d.count === "number" ? d.count : null }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [audience, verifiedOnly, countKey]);

  async function submit(test: boolean) {
    if (!test && !window.confirm(`Send “${subject}” to ${count ?? "all"} people? This can't be undone.`)) return;
    setBusy(test ? "test" : "send");
    setResult(null);
    const res = await fetch("/api/admin/email-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, verifiedOnly, subject, message, buttonLabel, buttonUrl, test }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setResult({ ok: false, text: data?.error ?? "Couldn't send." });
      return;
    }
    setResult({
      ok: true,
      text: test
        ? `Test sent to ${data.sentTo} — check your inbox.`
        : `Sent to ${data.sent} of ${data.recipients} people${data.failed ? ` (${data.failed} failed — see the log)` : ""}.`,
    });
    if (!test) router.refresh();
  }

  const selected = audiences.find((a) => a.id === audience)!;
  const ready = subject.trim().length >= 3 && message.trim().length >= 10;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
          Send to
          <select value={audience} onChange={(e) => setAudience(e.target.value as EmailAudience)} className={inputClass}>
            {audiences.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
            ID-verified accounts only
          </label>
          <p className="text-sm font-medium">{count === null ? "Counting…" : `${count.toLocaleString()} recipient${count === 1 ? "" : "s"}`}</p>
        </div>
      </div>
      <p className="-mt-2 text-xs text-foreground/50">
        {selected.hint}
        {audience === "newsletter" && " Each email includes an unsubscribe link."}
      </p>

      <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
        Message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          maxLength={10000}
          placeholder="Write as you would in a normal email. Leave a blank line between paragraphs. Each person is greeted by their first name automatically."
          className={inputClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
          Button text (optional)
          <input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} maxLength={40} placeholder="e.g. Browse listings" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
          Button link (optional)
          <input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://…" className={inputClass} />
        </label>
      </div>

      {result && <p className={`text-sm ${result.ok ? "text-verified" : "text-red-600"}`}>{result.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || busy !== null}
          onClick={() => submit(true)}
          className="h-10 rounded-full border border-line px-5 text-sm font-medium hover:border-clay hover:text-clay disabled:opacity-50"
        >
          {busy === "test" ? "Sending test…" : "Send test to me"}
        </button>
        <button
          type="button"
          disabled={!ready || busy !== null || !count}
          onClick={() => submit(false)}
          className="h-10 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "send" ? "Sending…" : `Send to ${count ?? "…"} people`}
        </button>
      </div>
    </div>
  );
}
