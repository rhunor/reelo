# Reallow

Direct landlord-to-tenant rental platform for Nigeria. Next.js (App Router) + TypeScript, MongoDB, deployed on Vercel.

**Landlords and tenants never contact each other directly.** Every inquiry, inspection booking,
and coordination need routes through Reallow/Reallow staff (admin/support). There is no
peer-to-peer chat feature by design.

## Getting started

```bash
cp .env.example .env.local   # fill in MONGODB_URI and AUTH_SECRET at minimum
npm run seed                 # creates a demo landlord + mock published listings
npm run dev
```

Visit `/api/health` to confirm the MongoDB connection is wired up correctly, and `/listings` to
see the seeded mock properties.

Demo landlord login (created by `npm run seed`): `demo.landlord@reallow.test` / `password123`

## Project structure

- `src/app/` — routes. `listings/` (public browse/search), `(auth)/` (login, register),
  `dashboard/{landlord,tenant,admin,support}/` (role dashboards, gated by `src/proxy.ts`),
  `agreements/[id]/` (shared tenancy-agreement view/sign page), `landlords/[id]/` (public
  landlord profile), `pricing/`, `api/`
- `src/auth.config.ts` — edge-safe Auth.js config (RBAC `authorized` callback used by
  `src/proxy.ts`, no DB/bcrypt so it can run in the edge runtime)
- `src/auth.ts` — full Auth.js config (Credentials provider backed by the `users` collection,
  JWT session carrying role/subscription tier/verified badge)
- `src/lib/mongodb.ts` — MongoDB client singleton (Vercel-serverless-safe connection reuse)
- `src/lib/db.ts` — typed collection getters
- `src/lib/subscription-tiers.ts` — single source of truth for Free/Pro/Pro+ pricing and
  inspection-booking limits, plus `canBookInspection()` / `canContactReallow()`
- `src/lib/listing-verification.ts` — the ₦15,000 landlord listing-verification fee constant
- `src/lib/paystack.ts` — Paystack transaction initialize/verify + webhook signature check
- `src/lib/youverify.ts` — Youverify NIN verification client
- `src/lib/cloudinary.ts` — signed upload signature generation for the photo uploader
- `src/types/models.ts` — domain model types (User, Property, SupportTicket, InspectionBooking,
  Agreement, Transaction, ListingReview)
- `scripts/seed.ts` — seeds a demo landlord + mock published properties (run with `npm run seed`)

## Monetization

Three mechanisms coexist:

1. **Per-transaction platform commission** — disclosed, itemised fee on completed
   rent/deposit payments (configurable from the admin panel; not yet wired to a UI).
2. **Tenant subscription tiers** (Paystack-billed), gating contact with Reallow about a listing and
   inspection bookings — enforced server-side via `canContactReallow()` / `canBookInspection()`:
   - **Free** — browse/search only, no listing inquiries, no inspection bookings
   - **Pro** — ₦3,000/month, up to 5 inspection bookings/month
   - **Pro+** — ₦7,000/month, unlimited inspection bookings
3. **Landlord listing-verification fee (₦15,000, one-off per listing)** — see below.

`/pricing` has working "Subscribe" buttons that call `/api/subscriptions/checkout`, initialize a
Paystack transaction, and redirect to Paystack's checkout page.

**Recurring billing:** if `PAYSTACK_PRO_PLAN_CODE` / `PAYSTACK_PRO_PLUS_PLAN_CODE` are set (create
these once as Plans in the Paystack dashboard — deliberately not done via API, since naming/amount
should be a reviewed dashboard action), checkout passes `plan` to Paystack, which creates a native
recurring subscription and auto-charges the card monthly. Without them, it falls back to a one-off
transaction the user has to repeat manually. `/api/payments/paystack/webhook` handles
`charge.success` (both first checkout and unmetadata'd renewal charges, matched by customer email),
`subscription.create` (stores the subscription code), `invoice.payment_failed` (marks
`past_due`), and `subscription.disable` (cancels, reverts to Free). **These lifecycle event
payload shapes are implemented from documented Paystack behavior, not verified against a live
account — check real webhook deliveries in the Paystack dashboard before relying on this in
production.**

## Landlord listing flow

A listing only becomes publicly visible after Reallow physically inspects and an admin approves
it. State machine on `Property.status`:

`draft` → (landlord pays ₦15,000) → `pending_verification` → (admin schedules + approves/rejects) → `published` or `rejected`

- `/dashboard/landlord/listings/new` — landlord creates a listing (`POST /api/listings`), saved as
  `draft`. Photos go through `src/components/photo-uploader.tsx`, which gets a signed upload from
  `/api/uploads/cloudinary-signature` and uploads directly to Cloudinary from the browser.
- `/dashboard/landlord` — lists the landlord's own listings with status, and a "Pay ₦15,000 for
  verification inspection" button on `draft`/`rejected` listings
  (`POST /api/listings/[id]/verification-checkout` → Paystack). On `charge.success` the webhook
  flips the listing to `pending_verification`.
- `/dashboard/admin` — queue of `pending_verification` listings. Admin can set
  `verification.scheduledFor` (the in-person visit date — coordinated manually, no calendar
  integration) and Approve (→ `published`) or Reject (→ `rejected`, with a reason shown to the
  landlord) via `src/app/dashboard/admin/actions.ts` server actions.
- `/listings` only ever queries `status: "published"`, so nothing shows publicly until approved.

## Contacting Reallow (no landlord↔tenant chat)

Listing inquiries and general support requests are both `SupportTicket` documents, identical in
shape: a ticket belongs to one user (`userId`, `userRole`), optionally references a `listingId`,
and has a `messages[]` thread. Reallow staff (admin/support) reply from the same thread — there's no
second thread type.

- `/listings/[id]` — Pro/Pro+ tenants see `src/components/contact-reelo-form.tsx` (creates a
  listing-scoped ticket) and the inspection-booking form. Free tier / logged-out visitors see an
  upgrade/login CTA. Gating reads the viewer's subscription tier **fresh from MongoDB**, not the
  session JWT, since a Paystack webhook can upgrade a tier without refreshing an existing login
  token.
- `/dashboard/{tenant,landlord}/tickets` — a user's own tickets + `.../tickets/new` for general
  (non-listing) questions.
- `/dashboard/support` — queue of open/in-progress tickets for admin/support staff, with
  resolve/reopen actions.

## Tenancy agreement + e-signature

Because Reallow coordinates everything, **admin** (not the landlord) creates the agreement from
`/dashboard/admin/agreements/new`, referencing a listing and the tenant's email. Both the landlord
and tenant then review and sign at `/agreements/[id]` — e-signature is a typed full name producing
a SHA-256 hash + timestamp + IP address audit record (`Agreement.signatures[]`), not a drawn
signature. Status moves `sent` → `signed_by_landlord`/`signed_by_tenant` → `fully_signed` once both
have signed. There's no PDF-generation/cloud-storage pipeline for agreements — the signed page is
designed to be saved via the browser's print-to-PDF instead, to avoid a second file-storage
integration beyond Cloudinary.

## Reviews & trust score

Reviews are gated on a `fully_signed` agreement (the closest proxy this build has to "completed
transaction," since a full rent-payment lifecycle isn't built). Once an agreement is fully signed,
each party can rate the other once via `POST /api/reviews`, which recomputes `User.ratingAverage`/
`ratingCount`. Landlord ratings are public on `/landlords/[id]`; tenant ratings are only shown to
the tenant themselves on `/dashboard/tenant` (tenants aren't publicly browsable).

## Identity verification

`src/lib/youverify.ts` calls Youverify's NIN lookup endpoint from
`src/app/api/kyc/verify-nin/route.ts`, sets `user.nin.status` and `user.verifiedBadge`. The exact
request/response shape should be confirmed against Youverify's current docs before going live —
implemented from the commonly documented v2 API shape, not a live-tested integration.

## Not yet built

- Rent/deposit payment collection and the full "completed transaction" lifecycle (reviews currently
  key off agreement signing instead)
- FAQ/knowledge base content for the support flow
- Saved searches / alerts, map view, sorting (PRD section 7.2)
- Recurring billing renewal automation is implemented but unverified against live Paystack webhook
  payloads — see the Monetization section above

## Deploying

Deploy on Vercel; set the environment variables from `.env.example` in the Vercel project
settings, and point the Paystack webhook at the deployed URL
(`/api/payments/paystack/webhook`).
