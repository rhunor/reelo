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
          const { users } = await getCollections();
          const current = await users.findOne(
            { _id: new ObjectId(token.sub) },
            { projection: { status: 1, role: 1, verifiedBadge: 1 } },
          );
          // Blocked or deleted: returning null ends the session.
          if (!current || current.status === "banned") return null;
          // Legacy "tenant"/"landlord" accounts are plain users now.
          token.role = current.role === "tenant" || current.role === "landlord" ? "user" : current.role;
          token.verifiedBadge = current.verifiedBadge;
          token.checkedAt = Date.now();
        } catch {
          // A database hiccup shouldn't log everyone out — try again next request.
        }
      }
      return token;
    },
  },
});
