import { createHmac } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  return key;
}

interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  // When set, Paystack creates a recurring subscription against this plan and
  // auto-charges the card monthly instead of this being a one-off transaction.
  plan?: string;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      plan: params.plan,
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.status) {
    throw new Error(result?.message ?? "Failed to initialize Paystack transaction");
  }

  return {
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
    reference: result.data.reference,
  };
}

export interface VerifiedTransaction {
  status: "success" | "failed" | "abandoned";
  amount: number;
  reference: string;
  metadata?: Record<string, unknown>;
}

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${getSecretKey()}` } },
  );

  const result = await response.json();
  if (!response.ok || !result.status) {
    throw new Error(result?.message ?? "Failed to verify Paystack transaction");
  }

  return result.data as VerifiedTransaction;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const hash = createHmac("sha512", getSecretKey()).update(rawBody).digest("hex");
  return hash === signature;
}
