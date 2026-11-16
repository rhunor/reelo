import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { namesMatch } from "@/lib/kyc";
import { listBanks, resolveAccount, upsertSubaccount } from "@/lib/paystack";
import { getOrCreateReallowLandlordId } from "@/lib/reallow-landlord";
import { isStaffRole } from "@/lib/roles";
import type { User } from "@/types/models";

export type PayoutAccountResult =
  | { ok: true; accountName: string; bankName: string }
  | { ok: false; status: number; message: string };

// A property owner's payout account: Paystack looks the account number up and returns the
// name the bank holds; it must be the owner's own (matching their verified ID) before it's
// registered as the Paystack subaccount their share of every rent/sale payment settles to.
// Also kept as bankDetails, which referral withdrawals are paid to.
export async function savePayoutAccount(userId: ObjectId, bankCode: string, accountNumber: string): Promise<PayoutAccountResult> {
  const { users } = await getCollections();
  const user = await users.findOne({ _id: userId });
  if (!user) return { ok: false, status: 404, message: "Account not found." };
  // Staff (who withdraw referral earnings) are internal accounts without a customer ID check;
  // everyone else must be verified so there's a confirmed name to match the account to.
  if (!user.verifiedBadge && !isStaffRole(user.role)) {
    return { ok: false, status: 403, message: "Verify your identity first — your payout account must be in the same name." };
  }

  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) return { ok: false, status: 400, message: "Choose your bank from the list." };

  let accountName: string;
  try {
    ({ accountName } = await resolveAccount(accountNumber, bankCode));
  } catch {
    return { ok: false, status: 422, message: "We couldn't find that account number at this bank. Check it and try again." };
  }
  if (!namesMatch(user, { firstName: accountName })) {
    return {
      ok: false,
      status: 422,
      message: `This account is in the name "${accountName}", which doesn't match your verified name. Use an account in your own name.`,
    };
  }

  let subaccountCode: string;
  try {
    ({ subaccountCode } = await upsertSubaccount(user.payoutAccount?.subaccountCode, {
      businessName: accountName,
      bankCode,
      accountNumber,
    }));
  } catch (error) {
    console.error("[payout-account] subaccount failed:", error);
    return { ok: false, status: 502, message: "We couldn't set up your payout account right now — please try again shortly." };
  }

  const now = new Date();
  await users.updateOne(
    { _id: userId },
    {
      $set: {
        payoutAccount: { bankCode, bankName: bank.name, accountNumber, accountName, subaccountCode, verifiedAt: now },
        bankDetails: { accountName, accountNumber, bankName: bank.name },
        updatedAt: now,
      },
    },
  );
  return { ok: true, accountName, bankName: bank.name };
}

// Where an owner's share of a payment settles. Listings held by Reallow's own placeholder
// owner account need no subaccount — that money is Reallow's — so they return null.
export async function settlementFor(
  owner: Pick<User, "_id" | "payoutAccount"> | null,
): Promise<{ kind: "reallow" } | { kind: "subaccount"; code: string } | { kind: "missing" }> {
  if (!owner?._id) return { kind: "missing" };
  const reallowId = await getOrCreateReallowLandlordId();
  if (owner._id.equals(reallowId)) return { kind: "reallow" };
  return owner.payoutAccount?.subaccountCode ? { kind: "subaccount", code: owner.payoutAccount.subaccountCode } : { kind: "missing" };
}
