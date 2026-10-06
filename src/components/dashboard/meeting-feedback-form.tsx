"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FEEDBACK_TAGS, STAFF_FEEDBACK_TAGS } from "@/lib/feedback";
import type { FeedbackTargetType } from "@/types/models";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

// Tags are stored in English (admins read them); only the label is translated.
function tagKey(tag: string): MessageKey {
  return ("feedbackTag." + tag.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "")) as MessageKey;
}

export function MeetingFeedbackForm({
  targetType,
  targetId,
  onCancel,
  audience = "customer",
}: {
  targetType: FeedbackTargetType;
  targetId: string;
  onCancel: () => void;
  audience?: "customer" | "staff";
}) {
  const tagOptions = audience === "staff" ? STAFF_FEEDBACK_TAGS : FEEDBACK_TAGS;
  const router = useRouter();
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function submit() {
    if (!rating) return setError(t("feedback.chooseRating"));
    setLoading(true);
    setError(null);
    const res = await fetch("/api/meeting-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, rating, tags, comment: comment || undefined }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) return setError(data?.error ?? t("feedback.failed"));
    router.refresh();
  }

  const shown = hover || rating;

  return (
    <div className="mt-3 rounded-lg bg-foreground/5 p-3">
      <p className="text-xs font-medium">{t("feedback.howDidItGo")}</p>
      <div className="mt-1.5 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={t(star === 1 ? "feedback.starOne" : "feedback.stars", { count: star })}
            onMouseEnter={() => setHover(star)}
            onClick={() => setRating(star)}
            className={`text-2xl leading-none ${star <= shown ? "text-amber-500" : "text-foreground/20"}`}
          >
            ★
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tagOptions.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              tags.includes(tag) ? "border-clay bg-clay/10 text-clay" : "border-line text-foreground/70"
            }`}
          >
            {t(tagKey(tag))}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={t("feedback.anythingElse")}
        className="mt-2 w-full rounded-md border border-line bg-background px-2 py-1.5 text-sm"
      />
      <p className="mt-1 text-[11px] text-foreground/50">
        {t(audience === "staff" ? "feedback.adminOnly" : "feedback.private")}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="h-8 rounded-full bg-clay px-4 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.sending") : t("feedback.send")}
        </button>
        <button type="button" onClick={onCancel} className="h-8 px-2 text-xs text-foreground/60">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
