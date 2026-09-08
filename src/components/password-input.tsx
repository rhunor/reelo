"use client";

import { useState } from "react";

export function PasswordInput({
  name,
  placeholder,
  required,
  minLength,
  className,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={className ?? "w-full rounded-lg border border-line px-3 py-2.5 pr-10 focus:border-clay focus:outline-none"}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-foreground/50 hover:text-foreground"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.3A9.6 9.6 0 0112 5c5 0 9 4 10.5 7-.6 1.1-1.5 2.4-2.7 3.5M6.2 6.9C4.2 8.1 2.7 9.9 1.5 12c1.5 3 5.5 7 10.5 7 1.3 0 2.5-.3 3.6-.7"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7Z" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
