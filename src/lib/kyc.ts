import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { lookupDriversLicence, lookupNin, type IdentityRecord } from "@/lib/dojah";
import type { User } from "@/types/models";

// verifiedBadge means "one government ID verified and matching this account" — a NIN or a
// driver's licence. (BVN is no longer required; old BVN results are ignored.) Always
// recomputed from the stored results rather than set directly.
export async function recomputeVerifiedBadge(userId: ObjectId): Promise<boolean> {
  const { users } = await getCollections();
  const user = await users.findOne({ _id: userId });
  if (!user) return false;

  const verifiedBadge = user.nin.status === "verified" || user.driversLicence?.status === "verified";
  await users.updateOne({ _id: userId }, { $set: { verifiedBadge, updatedAt: new Date() } });
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

export type IdType = "nin" | "drivers_licence";

const FIELD: Record<IdType, "nin" | "driversLicence"> = { nin: "nin", drivers_licence: "driversLicence" };
const LABEL: Record<IdType, string> = { nin: "NIN", drivers_licence: "driver's licence" };

// Look the ID up with Dojah, check it belongs to this account holder, and store the result.
export async function verifyGovernmentId(
  userId: ObjectId,
  type: IdType,
  number: string,
): Promise<{ success: boolean; message: string; verifiedBadge: boolean; status: number }> {
  const { users } = await getCollections();
  const field = FIELD[type];
  const user = await users.findOne({ _id: userId });
  if (!user) return { success: false, message: "Account not found.", verifiedBadge: false, status: 404 };

  if (await users.findOne({ [`${field}.value`]: number, [`${field}.status`]: "verified", _id: { $ne: userId } })) {
    return {
      success: false,
      message: `This ${LABEL[type]} is already linked to another Reallow account.`,
      verifiedBadge: user.verifiedBadge,
      status: 409,
    };
  }

  const result = type === "nin" ? await lookupNin(number) : await lookupDriversLicence(number);
  if (!result.ok) {
    // A provider outage or missing keys isn't the user's failure — don't record "failed".
    if (result.reason === "not_found" || result.reason === "error") {
      await users.updateOne({ _id: userId }, { $set: { [`${field}.status`]: "failed", [`${field}.provider`]: "dojah", updatedAt: new Date() } });
    }
    return { success: false, message: result.message, verifiedBadge: user.verifiedBadge, status: result.reason === "not_found" ? 404 : 502 };
  }

  if (!namesMatch(user, result.record)) {
    await users.updateOne({ _id: userId }, { $set: { [`${field}.status`]: "failed", [`${field}.provider`]: "dojah", updatedAt: new Date() } });
    return {
      success: false,
      message: `The name on this ${LABEL[type]} doesn't match the name on your Reallow account. Make sure your account uses your legal name, or contact Reallow.`,
      verifiedBadge: user.verifiedBadge,
      status: 422,
    };
  }
  if (!datesMatch(user.profile?.dateOfBirth, result.record.dateOfBirth)) {
    await users.updateOne({ _id: userId }, { $set: { [`${field}.status`]: "failed", [`${field}.provider`]: "dojah", updatedAt: new Date() } });
    return {
      success: false,
      message: `The date of birth on this ${LABEL[type]} doesn't match your profile.`,
      verifiedBadge: user.verifiedBadge,
      status: 422,
    };
  }

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        [`${field}.status`]: "verified",
        [`${field}.provider`]: "dojah",
        [`${field}.verifiedAt`]: new Date(),
        [`${field}.value`]: number,
        updatedAt: new Date(),
      },
    },
  );
  const verifiedBadge = await recomputeVerifiedBadge(userId);
  return { success: true, message: "Verified", verifiedBadge, status: 200 };
}
