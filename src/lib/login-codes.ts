import crypto from "crypto";
import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";

// One-time codes and links for signing in and resetting passwords. Only SHA-256 hashes are
// stored, every code/link works once, and they expire.
export const LOGIN_CODE_MINUTES = 10;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_RESEND_SECONDS = 30;
export const PASSWORD_RESET_MINUTES = 30;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const codeHash = (userId: ObjectId, code: string) => sha256(`${userId.toString()}:${code}`);

// A new 6-digit code (replaces any earlier one). Returns null when one was sent too recently.
export async function issueLoginCode(userId: ObjectId): Promise<string | null> {
  const { users } = await getCollections();
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  const result = await users.updateOne(
    {
      _id: userId,
      $or: [
        { loginCode: { $exists: false } },
        { "loginCode.sentAt": { $lt: new Date(now.getTime() - LOGIN_CODE_RESEND_SECONDS * 1000) } },
      ],
    },
    {
      $set: {
        loginCode: {
          hash: codeHash(userId, code),
          expiresAt: new Date(now.getTime() + LOGIN_CODE_MINUTES * 60 * 1000),
          attempts: 0,
          sentAt: now,
        },
      },
    },
  );
  return result.modifiedCount === 1 ? code : null;
}

// Checks a typed code. Each check counts as an attempt; after LOGIN_CODE_MAX_ATTEMPTS wrong
// tries the code is dead and a new one has to be requested. A correct code is used up.
export async function verifyLoginCode(userId: ObjectId, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const { users } = await getCollections();
  const counted = await users.findOneAndUpdate(
    { _id: userId, "loginCode.expiresAt": { $gt: new Date() }, "loginCode.attempts": { $lt: LOGIN_CODE_MAX_ATTEMPTS } },
    { $inc: { "loginCode.attempts": 1 } },
    { returnDocument: "after", projection: { loginCode: 1 } },
  );
  const stored = counted?.loginCode;
  if (!stored) return false;
  const ok = crypto.timingSafeEqual(Buffer.from(stored.hash), Buffer.from(codeHash(userId, code)));
  if (ok) await users.updateOne({ _id: userId }, { $unset: { loginCode: "" } });
  return ok;
}

// Registration signs the new account in straight away — this short-lived token stands in
// for the emailed code, once.
export async function issueSignupLogin(userId: ObjectId): Promise<string> {
  const { users } = await getCollections();
  const token = crypto.randomBytes(24).toString("hex");
  await users.updateOne(
    { _id: userId },
    { $set: { signupLogin: { hash: sha256(token), expiresAt: new Date(Date.now() + 5 * 60 * 1000) } } },
  );
  return token;
}

export async function consumeSignupLogin(userId: ObjectId, token: string): Promise<boolean> {
  const { users } = await getCollections();
  const result = await users.updateOne(
    { _id: userId, "signupLogin.hash": sha256(token), "signupLogin.expiresAt": { $gt: new Date() } },
    { $unset: { signupLogin: "" } },
  );
  return result.modifiedCount === 1;
}

// "Forgot password": a random link token, valid for PASSWORD_RESET_MINUTES. Returns null
// when a link was sent in the last minute (stops someone flooding an inbox).
export async function issuePasswordReset(userId: ObjectId): Promise<string | null> {
  const { users } = await getCollections();
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const result = await users.updateOne(
    {
      _id: userId,
      $or: [{ passwordReset: { $exists: false } }, { "passwordReset.sentAt": { $lt: new Date(now.getTime() - 60 * 1000) } }],
    },
    {
      $set: {
        passwordReset: {
          hash: sha256(token),
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_MINUTES * 60 * 1000),
          sentAt: now,
        },
      },
    },
  );
  return result.modifiedCount === 1 ? token : null;
}

// Finds the account a reset link belongs to (still valid), without using it up.
export async function findPasswordReset(token: string) {
  const { users } = await getCollections();
  return users.findOne(
    { "passwordReset.hash": sha256(token), "passwordReset.expiresAt": { $gt: new Date() } },
    { projection: { name: 1, firstName: 1, email: 1 } },
  );
}

// Uses the link up and sets the new password hash in one atomic step.
export async function consumePasswordReset(token: string, passwordHash: string): Promise<ObjectId | null> {
  const { users } = await getCollections();
  const user = await users.findOneAndUpdate(
    { "passwordReset.hash": sha256(token), "passwordReset.expiresAt": { $gt: new Date() } },
    { $set: { passwordHash, updatedAt: new Date() }, $unset: { passwordReset: "", loginCode: "" } },
    { projection: { _id: 1 } },
  );
  return user?._id ?? null;
}
