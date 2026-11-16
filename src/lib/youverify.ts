// Youverify identity lookups (https://doc.youverify.co — "KYC - Nigeria"). Every account
// starts in a sandbox that returns mock records and isn't billed (YOUVERIFY_ENV unset or
// "sandbox"; test NIN or BVN 12345678901). Set YOUVERIFY_ENV to "production" with a production
// key, and fund the Youverify wallet, to query real government records. Sandbox and
// production keys are different — a key used against the other environment gets a 401.
//
// Env: YOUVERIFY_API_KEY (Youverify dashboard → Settings → API Keys), YOUVERIFY_ENV.
const BASE_URL =
  process.env.YOUVERIFY_ENV === "production" ? "https://api.youverify.co" : "https://api.sandbox.youverify.co";

// Until the key is added, verification falls back to manual review (see kyc.ts).
export function isYouverifyConfigured(): boolean {
  return Boolean(process.env.YOUVERIFY_API_KEY);
}

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

type YouverifyData = {
  status?: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
};

async function youverifyPost(path: string, body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const key = process.env.YOUVERIFY_API_KEY;
  if (!key) throw new Error("config");

  // The key goes in a `token` header as-is — Youverify does not use "Authorization: Bearer".
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { token: key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json };
}

function failure(status: number, body: unknown): LookupResult {
  const message = (body as { message?: string } | null)?.message;
  if (status === 404) return { ok: false, reason: "not_found", message: "We couldn't find a record for that number." };
  if (status === 429 || status >= 500) {
    return { ok: false, reason: "unavailable", message: "The verification service is busy right now — please try again in a few minutes." };
  }
  if (status === 401 || status === 402 || status === 403) {
    // Wrong key (or a sandbox key on production) or an empty Youverify wallet: Reallow's
    // problem, not the user's.
    console.error(`[youverify] ${status}:`, message);
    return { ok: false, reason: "unavailable", message: "Verification is temporarily unavailable — please try again later." };
  }
  return { ok: false, reason: "error", message: message || "We couldn't verify that number. Check it and try again." };
}

// `consent` must be true: Youverify only runs a check when the person has agreed to it,
// which the verify form asks for (and the API routes require) before calling this.
async function lookup(path: string, id: string, requestId: string): Promise<LookupResult> {
  try {
    const { status, body } = await youverifyPost(path, { id, isSubjectConsent: true, metadata: { requestId } });
    const data = (body as { data?: YouverifyData } | null)?.data;
    if (status !== 200 || !data) return failure(status, body);
    // A number that isn't on the register still comes back 200, with status "not_found".
    if (data.status !== "found") return { ok: false, reason: "not_found", message: "We couldn't find a record for that number." };
    return {
      ok: true,
      record: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        middleName: data.middleName ?? undefined,
        dateOfBirth: data.dateOfBirth ?? undefined,
        gender: data.gender ?? undefined,
      },
    };
  } catch (error) {
    if ((error as Error).message === "config") {
      console.error("[youverify] YOUVERIFY_API_KEY not set");
      return { ok: false, reason: "config", message: "Verification isn't set up yet — please try again later." };
    }
    console.error("[youverify] request failed:", error);
    return { ok: false, reason: "unavailable", message: "The verification service is busy right now — please try again in a few minutes." };
  }
}

// requestId ties the check back to the Reallow account in Youverify's dashboard.
export function lookupNin(nin: string, requestId: string): Promise<LookupResult> {
  return lookup("/v2/api/identity/ng/nin", nin, requestId);
}

export function lookupBvn(bvn: string, requestId: string): Promise<LookupResult> {
  return lookup("/v2/api/identity/ng/bvn", bvn, requestId);
}
