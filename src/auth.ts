import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getCollections } from "@/lib/db";

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

        return {
          id: user._id!.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          subscriptionTier: user.subscription.tier,
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
        token.subscriptionTier = user.subscriptionTier;
        token.verifiedBadge = user.verifiedBadge;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.subscriptionTier = token.subscriptionTier;
      session.user.verifiedBadge = token.verifiedBadge;
      return session;
    },
  },
});
