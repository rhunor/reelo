// There's no self-service way to become admin or support staff — registration only offers
// tenant/landlord, by design (see POST /api/auth/register). This is the bootstrap path for
// those accounts, and can also promote an existing tenant/landlord account to staff.
//
// Usage: npm run create-admin -- <email> <password> [name]
//        npm run create-support -- <email> <password> [name]
import { config } from "dotenv";
config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import type { User, UserRole } from "../src/types/models";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI — set it in .env.local before running this");
  }

  const [, , role, emailArg, password, nameArg] = process.argv;
  if (role !== "admin" && role !== "support") {
    console.error('Usage: tsx scripts/create-staff.ts <admin|support> <email> <password> [name]');
    process.exit(1);
  }
  const email = emailArg?.toLowerCase();
  const name = nameArg || `Reallow ${role === "admin" ? "Admin" : "Support"}`;

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
    await users.insertOne({
      role: roleValue,
      name,
      email,
      passwordHash,
      nin: { status: "verified" },
      verifiedBadge: true,
      createdAt: now,
      updatedAt: now,
    } as User);
    console.log(`Created ${role} account: ${email}`);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
