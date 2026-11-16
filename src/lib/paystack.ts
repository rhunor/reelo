import { createHmac } from "crypto";

// Reallow never holds customer money (Paystack's compliance requirement for a marketplace
// without a CBN payment licence). A rent or sale payment is split at the point of payment:
// the owner's share settles straight to their Paystack subaccount (created from their
// verified payout bank account, see lib/payout-account.ts) and only Reallow's service charge
// settles to Reallow — `subaccount` + `transactionChargeKobo` below. Payments for Reallow's
// own services (inspection and listing-verification fees) settle to Reallow as normal.
// Refunds go back to the customer's card through Paystack (createRefund), never to a balance.
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
  // Split payment: the subaccount the payment settles to, and Reallow's flat share in kobo.
  // Paystack's fee comes out of Reallow's share (bearer "account"), so the owner always
  // receives the full amount that isn't Reallow's.
  subaccount?: string;
  transactionChargeKobo?: number;
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
      ...(params.subaccount
        ? { subaccount: params.subaccount, transaction_charge: params.transactionChargeKobo ?? 0, bearer: "account" }
        : {}),
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

async function paystackRequest<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${getSecretKey()}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status) {
    throw new Error(result?.message ?? `Paystack request failed (${response.status})`);
  }
  return result.data as T;
}

export interface PaystackBank {
  name: string;
  code: string;
}

// Nigerian banks Paystack can settle to.
export async function listBanks(): Promise<PaystackBank[]> {
  const banks = await paystackRequest<Array<{ name: string; code: string; active: boolean }>>(
    "/bank?country=nigeria&currency=NGN&perPage=200",
  );
  return banks.filter((b) => b.active).map(({ name, code }) => ({ name, code }));
}

// The name the bank holds for an account number — how a payout account is confirmed to be
// the account holder's own before any money can settle to it.
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
  const data = await paystackRequest<{ account_name: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  );
  return { accountName: data.account_name };
}

// Creates (or, given an existing code, updates) the subaccount a property owner's share of
// each payment settles to. percentage_charge is 0 because every payment sets Reallow's
// share explicitly (transaction_charge).
export async function upsertSubaccount(
  existingCode: string | undefined,
  { businessName, bankCode, accountNumber }: { businessName: string; bankCode: string; accountNumber: string },
): Promise<{ subaccountCode: string }> {
  const body = { business_name: businessName, settlement_bank: bankCode, account_number: accountNumber, percentage_charge: 0 };
  const data = existingCode
    ? await paystackRequest<{ subaccount_code: string }>(`/subaccount/${encodeURIComponent(existingCode)}`, { method: "PUT", body })
    : await paystackRequest<{ subaccount_code: string }>("/subaccount", { method: "POST", body });
  return { subaccountCode: data.subaccount_code ?? existingCode! };
}

// Sends a payment (or part of it) back to the customer's original payment method.
export async function createRefund(reference: string, amountKobo?: number): Promise<{ status: string }> {
  const data = await paystackRequest<{ status: string }>("/refund", {
    method: "POST",
    body: { transaction: reference, ...(amountKobo ? { amount: amountKobo } : {}) },
  });
  return { status: data.status };
}
