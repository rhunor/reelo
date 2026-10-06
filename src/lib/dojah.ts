// Dojah identity lookups (https://docs.dojah.io). Self-serve: every account starts in a
// free sandbox (DOJAH_ENV unset or "sandbox", test NIN 70123456789); switch DOJAH_ENV to
// "production" and fund the Dojah wallet to query real government records.
//
// Env: DOJAH_APP_ID, DOJAH_SECRET_KEY (Dashboard → Developers → Configuration), DOJAH_ENV.
const BASE_URL = process.env.DOJAH_ENV === "production" ? "https://api.dojah.io" : "https://sandbox.dojah.io";

export interface IdentityRecord {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string; // as returned by the provider
  gender?: string;
}

export type LookupResult =
  | { ok: true; record: IdentityRecord }
  | { ok: false; reason: "not_found" | "unavailable" | "config" | "error"; message: string };

async function dojahGet(path: string, params: Record<string, string>): Promise<{ status: number; body: unknown }> {
  const appId = process.env.DOJAH_APP_ID;
  const secret = process.env.DOJAH_SECRET_KEY;
  if (!appId || !secret) throw new Error("config");

  const url = `${BASE_URL}${path}?${new URLSearchParams(params).toString()}`;
  // Secret key goes in Authorization as-is — Dojah does not use a "Bearer" prefix.
  const response = await fetch(url, {
    headers: { AppId: appId, Authorization: secret, Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function failure(status: number, body: unknown): LookupResult {
  const message = (body as { error?: string; message?: string } | null)?.error ?? (body as { message?: string } | null)?.message;
  if (status === 404) return { ok: false, reason: "not_found", message: "We couldn't find a record for that number." };
  if (status === 424 || status === 429 || status >= 500) {
    return { ok: false, reason: "unavailable", message: "The verification service is busy right now — please try again in a few minutes." };
  }
  if (status === 401 || status === 402) {
    // Bad keys or an empty Dojah wallet: Reallow's problem, not the user's.
    console.error(`[dojah] ${status}:`, message);
    return { ok: false, reason: "unavailable", message: "Verification is temporarily unavailable — please try again later." };
  }
  return { ok: false, reason: "error", message: message || "We couldn't verify that number. Check it and try again." };
}

async function lookup(path: string, params: Record<string, string>, map: (entity: Record<string, string>) => IdentityRecord) {
  try {
    const { status, body } = await dojahGet(path, params);
    const entity = (body as { entity?: Record<string, string> } | null)?.entity;
    if (status !== 200 || !entity) return failure(status, body);
    return { ok: true, record: map(entity) } as LookupResult;
  } catch (error) {
    if ((error as Error).message === "config") {
      console.error("[dojah] DOJAH_APP_ID / DOJAH_SECRET_KEY not set");
      return { ok: false, reason: "config", message: "Verification isn't set up yet — please try again later." } as LookupResult;
    }
    console.error("[dojah] request failed:", error);
    return { ok: false, reason: "unavailable", message: "The verification service is busy right now — please try again in a few minutes." } as LookupResult;
  }
}

export function lookupNin(nin: string): Promise<LookupResult> {
  return lookup("/api/v1/kyc/nin", { nin }, (e) => ({
    firstName: e.first_name,
    lastName: e.last_name,
    middleName: e.middle_name,
    dateOfBirth: e.date_of_birth,
    gender: e.gender,
  }));
}

export function lookupDriversLicence(licenseNumber: string): Promise<LookupResult> {
  return lookup("/api/v1/kyc/dl", { license_number: licenseNumber }, (e) => ({
    firstName: e.firstName,
    lastName: e.lastName,
    middleName: e.middleName,
    dateOfBirth: e.birthDate,
    gender: e.gender,
  }));
}
