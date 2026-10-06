"use client";

import { PASSWORD_RULES } from "@/lib/password-policy";

// Live checklist under a new-password field.
export function PasswordStrength({ password }: { password: string }) {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const strength = passed / PASSWORD_RULES.length;
  const barColor = strength === 1 ? "bg-verified" : strength >= 0.6 ? "bg-amber-500" : "bg-red-500";

  return (
    <div aria-live="polite">
      <div className="flex h-1.5 gap-1">
        {PASSWORD_RULES.map((rule, i) => (
          <span key={rule.id} className={`flex-1 rounded-full ${i < passed && password ? barColor : "bg-foreground/10"}`} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={ok ? "text-verified" : "text-foreground/50"}>
              {ok ? "✓" : "○"} {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
