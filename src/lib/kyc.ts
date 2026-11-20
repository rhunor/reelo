import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { forgetAccount } from "@/auth";
import { isYouverifyConfigured, lookupBvn, lookupNin, type IdentityRecord } from "@/lib/youverify";
import { notifyAdmins, notifyIdAwaitingReview } from "@/lib/notifications";
import { translator, type MessageKey, type Translator } from "@/lib/i18n/dictionaries";
import type { User } from "@/types/models";

// verifiedBadge means "one government ID verified and matching this account" — a NIN or a
// BVN, the two choices on the verify form. A driver's licence verified before BVN replaced
// it still counts. Old BVN results from before BVN became a choice (no consentAt — only the
// current form records consent) were never checked against the account name, so they don't.
// Always recomputed from the stored results rather than set directly.
export async function recomputeVerifiedBadge(userId: ObjectId): Promise<boolean> {
  const { users } = await getCollections();
  const user = await users.findOne({ _id: userId });
  if (!user) return false;

  const verifiedBadge =
    user.nin.status === "verified" ||
    (user.bvn?.status === "verified" && Boolean(user.bvn.consentAt)) ||
    user.driversLicence?.status === "verified";
  await users.updateOne({ _id: userId }, { $set: { verifiedBadge, updatedAt: new Date() } });
  forgetAccount(userId.toString()); // so the session picks up the new badge straight away
  return verifiedBadge;
}

const normalize = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

// The account's first and last names must both appear among the names on the ID (in any
// order — Nigerian records often swap first/middle/surname). Stops someone verifying with
// another person's ID number.
export function namesMatch(user: Pick<User, "firstName" | "lastName" | "name">, record: IdentityRecord): boolean {
  const onId = new Set([...normalize(record.firstName), ...normalize(record.middleName), ...normalize(record.lastName)]);
  if (onId.size === 0) return false;
  const first = normalize(user.firstName ?? user.name.split(" ")[0]);
  const last = normalize(user.lastName ?? user.name.split(" ").slice(-1)[0]);
  return [...first, ...last].length > 0 && [...first, ...last].every((part) => onId.has(part));
}

// Only compared when both sides have a date — profile date of birth is optional.
function datesMatch(profileDob: string | undefined, idDob: string | undefined): boolean {
  if (!profileDob || !idDob) return true;
  const a = new Date(profileDob);
  const b = new Date(idDob);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return true;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export type IdType = "nin" | "bvn";

const FIELD: Record<IdType, "nin" | "bvn"> = { nin: "nin", bvn: "bvn" };
const LABEL: Record<IdType, string> = { nin: "NIN", bvn: "BVN" };

// Look the ID up with Youverify, check it belongs to this account holder, and store the
// result. Only called once the person has agreed to the check (the API routes require it);
// when they agreed is stored with the result.
export async function verifyGovernmentId(
  userId: ObjectId,
  type: IdType,
  number: string,
  // Messages go back to the user, so they're in the user's language.
  t: Translator = translator("en"),
): Promise<{ success: boolean; pending?: boolean; message: string; verifiedBadge: boolean; status: number }> {
  const idLabel = t(type === "nin" ? "id.nin.label" : "id.bvn.label");
  const { users } = await getCollections();
  const field = FIELD[type];
  const user = await users.findOne({ _id: userId });
  if (!user) return { success: false, message: t("id.err.noAccount"), verifiedBadge: false, status: 404 };

  if (await users.findOne({ [`${field}.value`]: number, [`${field}.status`]: "verified", _id: { $ne: userId } })) {
    return {
      success: false,
      message: t("id.err.taken", { id: idLabel }),
      verifiedBadge: user.verifiedBadge,
      status: 409,
    };
  }

  const consentAt = new Date();

  // No Youverify key yet: hold the number for a Reallow admin to check by hand instead of
  // showing the user an error. Admins are notified and verify from Admin → People.
  if (!isYouverifyConfigured()) {
    await users.updateOne(
      { _id: userId },
      { $set: { [`${field}.status`]: "pending", [`${field}.value`]: number, [`${field}.consentAt`]: consentAt, updatedAt: new Date() } },
    );
    await notifyIdAwaitingReview(userId, user.name, LABEL[type]);
    return {
      success: true,
      pending: true,
      message: t("id.pendingMessage", { id: idLabel }),
      verifiedBadge: user.verifiedBadge,
      status: 200,
    };
  }

  const requestId = userId.toString();
  const result = type === "nin" ? await lookupNin(number, requestId) : await lookupBvn(number, requestId);
  if (!result.ok) {
    // A provider outage or missing keys isn't the user's failure — don't record "failed".
    if (result.reason === "not_found" || result.reason === "error") {
      await users.updateOne({ _id: userId }, { $set: { [`${field}.status`]: "failed", [`${field}.provider`]: "youverify", [`${field}.consentAt`]: consentAt, updatedAt: new Date() } });
    }
    const reasonKey: Record<typeof result.reason, MessageKey> = {
      not_found: "id.err.notFound",
      unavailable: "id.err.unavailable",
      config: "id.err.unavailable",
      error: "id.failed",
    };
    return { success: false, message: t(reasonKey[result.reason]), verifiedBadge: user.verifiedBadge, status: result.reason === "not_found" ? 404 : 502 };
  }

  if (!namesMatch(user, result.record)) {
    await users.updateOne({ _id: userId }, { $set: { [`${field}.status`]: "failed", [`${field}.provider`]: "youverify", [`${field}.consentAt`]: consentAt, updatedAt: new Date() } });
    return {
      success: false,
      message: t("id.err.nameMismatch", { id: idLabel }),
      verifiedBadge: user.verifiedBadge,
      status: 422,
    };
  }
  if (!datesMatch(user.profile?.dateOfBirth, result.record.dateOfBirth)) {
    await users.updateOne({ _id: userId }, { $set: { [`${field}.status`]: "failed", [`${field}.provider`]: "youverify", [`${field}.consentAt`]: consentAt, updatedAt: new Date() } });
    return {
      success: false,
      message: t("id.err.dobMismatch", { id: idLabel }),
      verifiedBadge: user.verifiedBadge,
      status: 422,
    };
  }

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        [`${field}.status`]: "verified",
        [`${field}.provider`]: "youverify",
        [`${field}.consentAt`]: consentAt,
        [`${field}.verifiedAt`]: new Date(),
        [`${field}.value`]: number,
        updatedAt: new Date(),
      },
    },
  );
  const verifiedBadge = await recomputeVerifiedBadge(userId);
  await notifyAdmins("Identity verified", `${user.name} verified their identity with their ${LABEL[type]}.`, `/dashboard/admin/users/${userId}`);
  return { success: true, message: t("id.verifiedBadge"), verifiedBadge, status: 200 };
}
