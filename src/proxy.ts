// The full auth config (src/auth.ts), not the database-free auth.config.ts: Proxy runs on
// the Node.js runtime in Next 16, so the session's periodic account re-check works here
// too. That's what lets a role change or a block take effect within a minute — the proxy
// rewrites the session cookie with the account's current role — rather than whenever the
// person next logs in.
import { auth } from "@/auth";

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
