"use client";

import { useActionState, useState } from "react";
import { SUPPORTED_STATES } from "@/lib/locations";
import { changeUserRole, type RoleFormState } from "@/app/dashboard/admin/actions";
import type { UserRole } from "@/types/models";

const OPTIONS = [
  { value: "customer", label: "User" },
  { value: "staff", label: "Field staff" },
  { value: "support", label: "Support" },
  { value: "admin", label: "Admin" },
] as const;

export function UserRoleSelect({
  userId,
  role,
  isSelf,
  staffBase,
}: {
  userId: string;
  role: UserRole;
  isSelf: boolean;
  staffBase?: string;
}) {
  const [state, formAction, pending] = useActionState<RoleFormState, FormData>(changeUserRole, { status: "idle" });
  const current = role === "user" || role === "tenant" || role === "landlord" ? "customer" : role;
  const [selected, setSelected] = useState<string>(current);
  const needsBase = selected === "staff" || selected === "support";

  if (isSelf) return <span className="text-xs text-foreground/50">Your account</span>;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role
      </label>
      <select
        id={`role-${userId}`}
        name="role"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        disabled={pending}
        className="h-9 rounded-md border border-line bg-transparent px-2 text-sm"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {needsBase && (
        <select
          name="staffBase"
          defaultValue={staffBase ?? ""}
          required
          disabled={pending}
          aria-label="Base city"
          className="h-9 rounded-md border border-line bg-transparent px-2 text-sm"
        >
          <option value="" disabled>
            Base city
          </option>
          {SUPPORTED_STATES.map((city) => (
            <option key={city.value} value={city.value}>
              {city.value}
            </option>
          ))}
        </select>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-full border border-line px-3.5 text-sm font-medium hover:border-clay hover:text-clay disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.status !== "idle" && (
        <span role="status" className={`w-full text-xs ${state.status === "success" ? "text-verified" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
