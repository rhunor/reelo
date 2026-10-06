"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStaffAccount, type StaffAccountFormState } from "@/app/dashboard/admin/actions";
import { SUPPORTED_STATES } from "@/lib/locations";

const inputClass = "h-10 rounded-md border border-line bg-transparent px-3 text-sm disabled:opacity-60";

export function CreateStaffAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<StaffAccountFormState, FormData>(createStaffAccount, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input name="name" placeholder="Full name" disabled={pending} className={inputClass} />
      <input name="email" type="email" placeholder="Email" required disabled={pending} className={inputClass} />
      <input
        name="password"
        type="password"
        placeholder="Password (8+, A–Z, a–z, 0–9, symbol)"
        required
        minLength={8}
        disabled={pending}
        className={inputClass}
      />
      <select name="staffBase" required defaultValue="" disabled={pending} className={inputClass}>
        <option value="" disabled>
          Base city
        </option>
        {SUPPORTED_STATES.map((city) => (
          <option key={city.value} value={city.value}>
            {city.label}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create staff account"}
        </button>
        {state.status !== "idle" && (
          <p role="status" className={`text-sm ${state.status === "success" ? "text-verified" : "text-red-600"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
