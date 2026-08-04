"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({ agreementId, revieweeLabel }: { agreementId: string; revieweeLabel: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreementId, rating, comment: formData.get("comment") }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not submit review");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-lg border border-line p-4">
      <p className="text-sm font-medium">Rate your {revieweeLabel}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`h-8 w-8 rounded-full border text-sm ${
              value <= rating
                ? "border-transparent bg-clay text-white"
                : "border-line"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        rows={3}
        placeholder="Optional comment"
        className="rounded-md border border-line px-3 py-2 text-sm bg-transparent"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-9 self-start rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
