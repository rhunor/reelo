// One-off: converts legacy "tenant"/"landlord" accounts (and their support tickets) to the
// single "user" role. The app already treats both legacy values as "user", so this only
// tidies the data — it's safe to run more than once.
//
//   node scripts/migrate-roles-to-user.mjs          # dry run: prints what would change
//   node scripts/migrate-roles-to-user.mjs --apply  # actually updates the database
import fs from "node:fs";
import { MongoClient } from "mongodb";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const apply = process.argv.includes("--apply");
const client = new MongoClient(process.env.MONGODB_URI ?? env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? env.MONGODB_DB ?? "reallow");

const legacy = { $in: ["tenant", "landlord"] };
const userCount = await db.collection("users").countDocuments({ role: legacy });
const ticketCount = await db.collection("tickets").countDocuments({ userRole: legacy });
console.log(`${userCount} account(s) and ${ticketCount} ticket(s) still use tenant/landlord.`);

if (apply) {
  const users = await db.collection("users").updateMany({ role: legacy }, { $set: { role: "user" } });
  const tickets = await db.collection("tickets").updateMany({ userRole: legacy }, { $set: { userRole: "user" } });
  console.log(`Updated ${users.modifiedCount} account(s) and ${tickets.modifiedCount} ticket(s).`);
} else {
  console.log("Dry run — re-run with --apply to update.");
}
await client.close();
