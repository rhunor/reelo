import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

// Connects lazily, on first actual use, rather than throwing at import time.
// The root layout's header calls auth() on every page (including ones that never touch
// the database), so a module-level throw here would take down the whole site whenever
// MONGODB_URI is unset — even pages with nothing to do with Mongo.
export function getMongoClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  // `family: 4` forces IPv4 for the underlying TCP connections. On networks where IPv6 is
  // advertised but poorly routed (common with some ISPs/ATLAS shared-tier networking),
  // Node can pick a broken IPv6 path to Atlas that fails partway through the TLS
  // handshake — it surfaces as an opaque `SSL routines:ssl3_read_bytes:tlsv1 alert
  // internal error`, not a clear "can't reach IPv6" error. Forcing IPv4 is the standard
  // fix for this class of failure against Atlas.
  const options = { family: 4 as const };

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri, options).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri, options).connect();
  }

  return clientPromise;
}
