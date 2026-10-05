"use client";

import { useState } from "react";
import { MeetingFeedbackForm } from "@/components/dashboard/meeting-feedback-form";
import type { FeedbackTargetType } from "@/types/models";

// "Rate this visit" for field staff — opens the staff version of the feedback form.
export function StaffRateVisit({
  targetType,
  targetId,
  alreadyRated,
}: {
  targetType: FeedbackTargetType;
  targetId: string;
  alreadyRated: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (alreadyRated) return <p className="text-xs text-foreground/50">✓ You rated this visit.</p>;
  return open ? (
    <MeetingFeedbackForm targetType={targetType} targetId={targetId} audience="staff" onCancel={() => setOpen(false)} />
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs font-medium hover:border-clay hover:text-clay"
    >
      ★ Rate this visit
    </button>
  );
}
