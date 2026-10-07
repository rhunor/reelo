import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getCollections } from "@/lib/db";

// Lets the login page tell a blocked account apart from a wrong password.
class AccountBlockedError extends CredentialsSignin {
  code = "account_blocked";
}

// How often a signed-in session re-checks the account in the database, so blocking someone
// logs them out everywhere straight away rather than whenever their JWT expires. (Server
// components can't rewrite the cookie, so after the first minute this is a cheap by-_id
// lookup per request until the token is next refreshed by a route handler.)
const ACCOUNT_RECHECK_MS = 60_000;

// The re-check result, remembered per server instance for the same minute. Without this,
// once a token is a minute old *every* auth() call — the proxy, the header and the page
// each make one per navigation — went back to the database, which is what made every page
// feel slow. Blocking someone still takes effect within a minute.
type AccountSnapshot = { at: number; banned: boolean; missing: boolean; role?: string; verifiedBadge: boolean };
const accountCache = new Map<string, AccountSnapshot>();

async function accountSnapshot(userId: string): Promise<AccountSnapshot> {
  const cached = accountCache.get(userId);
  if (cached && Date.now() - cached.at < ACCOUNT_RECHECK_MS) return cached;

  const { users } = await getCollections();
  const current = await users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { status: 1, role: 1, verifiedBadge: 1 } },
  );
  const snapshot: AccountSnapshot = {
    at: Date.now(),
    missing: !current,
    banned: current?.status === "banned",
    // Legacy "tenant"/"landlord" accounts are plain users now.
    role: current ? (current.role === "tenant" || current.role === "landlord" ? "user" : current.role) : undefined,
    verifiedBadge: current?.verifiedBadge ?? false,
  };
  if (accountCache.size > 5000) accountCache.clear();
  accountCache.set(userId, snapshot);
  return snapshot;
}

// Called after an admin changes someone's role/status so it applies on this instance at once.
export function forgetAccount(userId: string) {
  accountCache.delete(userId);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { users } = await getCollections();
        const user = await users.findOne({ email: email.toLowerCase() });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        if (user.status === "banned") throw new AccountBlockedError();

        return {
          id: user._id!.toString(),
          name: user.name,
          email: user.email,
          role: user.role === "tenant" || user.role === "landlord" ? "user" : user.role,
          verifiedBadge: user.verifiedBadge,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.verifiedBadge = user.verifiedBadge;
        token.checkedAt = Date.now();
        return token;
      }

      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (token.sub && ObjectId.isValid(token.sub) && Date.now() - checkedAt > ACCOUNT_RECHECK_MS) {
        try {
          const current = await accountSnapshot(token.sub);
          // Blocked or deleted: returning null ends the session.
          if (current.missing || current.banned) return null;
          token.role = current.role as typeof token.role;
          token.verifiedBadge = current.verifiedBadge;
          token.checkedAt = current.at;
        } catch {
          // A database hiccup shouldn't log everyone out — try again next request.
        }
      }
      return token;
    },
  },
});
