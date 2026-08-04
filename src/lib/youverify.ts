const YOUVERIFY_BASE_URL =
  process.env.YOUVERIFY_ENV === "production"
    ? "https://api.youverify.co"
    : "https://sandbox.youverify.co";

export interface NinVerificationResult {
  success: boolean;
  message: string;
  data?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    photo?: string;
    [key: string]: unknown;
  };
}

// Endpoint/payload shape follows Youverify's documented NIN lookup API as of
// integration time — confirm against https://docs.youverify.co before going live,
// providers occasionally change field names between sandbox and production.
export async function verifyNin(nin: string): Promise<NinVerificationResult> {
  const apiKey = process.env.YOUVERIFY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing YOUVERIFY_API_KEY environment variable");
  }

  const response = await fetch(`${YOUVERIFY_BASE_URL}/v2/api/identity/ng/nin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: apiKey,
    },
    body: JSON.stringify({ id: nin, isSubjectConsent: true }),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, message: result?.message ?? "NIN verification failed" };
  }

  return {
    success: Boolean(result?.success ?? result?.data),
    message: result?.message ?? "Verified",
    data: result?.data,
  };
}
