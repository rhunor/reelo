"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

// Drop-in for <button type="submit"> inside a server-action <form>: disables itself and
// shows a spinner the instant it's clicked, so a slow action doesn't look like nothing
// happened (and can't be double-submitted).
export function SubmitButton({ children, className = "", disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending && (
        <svg viewBox="0 0 24 24" className="mr-1.5 inline-block h-3.5 w-3.5 shrink-0 animate-spin align-[-2px]" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
