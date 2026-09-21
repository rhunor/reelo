"use client";

import { useState } from "react";
import { SUPPORTED_STATES, DISTRICTS_BY_STATE, type SupportedState } from "@/lib/locations";

const selectClass = "h-10 rounded-full border border-line bg-transparent px-4 text-sm";

// A plain uncontrolled GET <form> (see src/app/listings/page.tsx) can't otherwise make the
// city options depend on the chosen state — this only intercepts the state select's
// onChange to decide which city <option>s to render; both selects keep their own `name`
// so the surrounding form still submits natively, no fetch involved.
export function LocationFilterSelects({
  defaultState,
  defaultCity,
}: {
  defaultState: string;
  defaultCity: string;
}) {
  const [state, setState] = useState(defaultState);
  const districts = DISTRICTS_BY_STATE[state as SupportedState] ?? [];

  return (
    <>
      <select
        name="state"
        value={state}
        onChange={(event) => setState(event.target.value)}
        className={selectClass}
      >
        <option value="">All states</option>
        {SUPPORTED_STATES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        name="city"
        defaultValue={state === defaultState ? defaultCity : ""}
        key={state}
        className={selectClass}
      >
        <option value="">All districts</option>
        {districts.map((district) => (
          <option key={district.value} value={district.value}>
            {district.label}
          </option>
        ))}
      </select>
    </>
  );
}
