// There's no self-service way to become admin, support, or field staff — registration
// only offers tenant/landlord, by design (see POST /api/auth/register). This is the
// bootstrap path for those accounts, and can also promote an existing account.
//
// Usage: npm run create-admin -- <email> <password> [name]
//        npm run create-support -- <email> <password> [name]
//        tsx scripts/create-staff.ts staff <email> <password> [name]
import { config } from "dotenv";
config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import type { User, UserRole } from "../src/types/models";
import { generateReferralCode } from "../src/lib/referrals";

const ROLE_LABELS: Record<string, string> = { admin: "Admin", support: "Support", staff: "Staff" };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI — set it in .env.local before running this");
  }

  const [, , role, emailArg, password, nameArg] = process.argv;
  if (role !== "admin" && role !== "support" && role !== "staff") {
    console.error('Usage: tsx scripts/create-staff.ts <admin|support|staff> <email> <password> [name]');
    process.exit(1);
  }
  const email = emailArg?.toLowerCase();
  const name = nameArg || `Reallow ${ROLE_LABELS[role]}`;

  if (!email || !password) {
    console.error(`Usage: npm run create-${role} -- <email> <password> [name]`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB || "reallow";
  const client = new MongoClient(uri, { family: 4 });
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection<User>("users");

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const existing = await users.findOne({ email });
  const roleValue: UserRole = role;

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      { $set: { role: roleValue, passwordHash, name, updatedAt: now } },
    );
    console.log(`Updated existing account ${email} to role "${role}".`);
  } else {
    const referralCode = await generateReferralCode(name.split(" ")[0] ?? "REALLOW");
    await users.insertOne({
      role: roleValue,
      name,
      email,
      passwordHash,
      nin: { status: "verified" },
      verifiedBadge: true,
      referralCode,
      walletBalanceNGN: 0,
      createdAt: now,
      updatedAt: now,
    } as User);
    console.log(`Created ${role} account: ${email} (referral code: ${referralCode})`);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
