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
- `src/lib/mapbox.ts` — geocoding for listing coordinates (also powers the browser map, see below)
- `src/lib/geo.ts` — haversine distance, used for the field-inspection check-in fraud check
- `src/lib/notifications.ts` — matches newly-published listings against saved searches
- `src/types/models.ts` — domain model types (User, Property, SupportTicket, InspectionBooking,
  Agreement, Transaction, ListingReview, SavedSearch, Notification)
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

- `/listings/[id]` — Pro/Pro+ tenants see `src/components/contact-reallow-form.tsx` (creates a
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

## Map, search & saved-search alerts

`/listings` has a location/type/price filter form (plain `GET` form, no client JS needed) and a
Mapbox map (`src/components/listings-map.tsx`, `react-map-gl` + `mapbox-gl`) alongside the list,
pinning every result that has coordinates. `/listings/[id]` shows the same map for just that one
property. Needs `NEXT_PUBLIC_MAPBOX_TOKEN` — without it the map area shows a "not configured"
placeholder rather than breaking the page. Mapbox's public token works for both browser rendering
and server-side calls, so only one token is needed.

Listing coordinates are geocoded automatically (`src/lib/mapbox.ts`) from the state/city/area text
when a landlord creates a listing (`POST /api/listings`) — best-effort, a geocoding miss just means
no map pin, it never blocks listing creation.

Search-demand tracking: whenever a signed-in tenant's search (`state`/`city`/`propertyType`/
`maxPrice`) returns zero results, it's saved as a `SavedSearch` (`src/types/models.ts`). When an
admin approves a listing, `notifySavedSearchMatches()` (`src/lib/notifications.ts`) checks every
saved search for a match and creates an in-app `Notification` for that tenant, tracked so the same
listing never notifies the same search twice. Tenants see these at
`/dashboard/tenant/notifications`, with an unread-count badge in the header.

## Tenant profile & landlord preferences

Tenants can optionally fill in background info (occupation, employer, income, household size, a
short note) at `/dashboard/tenant/profile` — everything is off by default behind a single
`visibleToLandlords` toggle (`User.tenantProfile`). Landlords can write free-text
`tenantPreferences` on their own listing (shown publicly on `/listings/[id]`) describing who
they're looking for — deliberately kept as free text rather than a structured list of tenant
attributes, so it can't become a checkbox list of protected characteristics to screen on.

**Where a landlord actually sees a tenant:** `/dashboard/landlord/candidates` lists everyone who's
opened a Reallow ticket about one of the landlord's listings (i.e. every inquiry is a candidate).
Two things are always shown regardless of the tenant's sharing choice — their name-or-"Interested
tenant" and their verification status (blue tick / "Not verified", see below) — since verification
is a platform trust signal, not personal background info. The rest of the profile only appears if
`visibleToLandlords` is on. A landlord can mark **"Prefer this tenant"**
(`POST /api/tickets/[id]/prefer`, ownership-checked against the listing) — this doesn't hand over
any contact info, it just flags the ticket (`SupportTicket.landlordPreferred`) for Reallow staff
(visible on `/dashboard/support/tickets/[id]`) to act on, and shows the tenant a friendly "the
landlord is interested in you" note on their own ticket. The tenancy-agreement page
(`/agreements/[id]`) also shows the shared profile once an agreement exists, for the same reason.
There's no notification yet for candidates who *aren't* preferred — deliberately out of scope for
now.

## Field inspection check-in

Reallow's own inspection staff (admin/support accounts) check in when they physically arrive to
verify a listing — `src/components/check-in-button.tsx` reads the browser's Geolocation API and
calls the `checkInAtListing` server action, which stores `verification.checkedInAt/By/Location` and
flags (not blocks) the check-in if it's more than 500m from the listing's own coordinates
(`src/lib/geo.ts`), as a lightweight fraud signal for admin review — GPS accuracy varies, so this is
advisory, not a hard gate. This is deliberately scoped to "check in at the moment of inspection,"
not continuous/background location tracking, which would need a native mobile app rather than a
browser tab.

## Payment custody

All payments (subscriptions, the ₦15,000 listing-verification fee, and eventually rent/deposit)
settle into Reallow's own Paystack account only — see the guardrail comment at the top of
`src/lib/paystack.ts`. No Paystack subaccount/`split_code` is used anywhere; payouts to landlords
happen out-of-band. Don't add split-payment params without deliberately revisiting this.

## Identity verification

`src/lib/youverify.ts` calls Youverify's NIN lookup endpoint from
`src/app/api/kyc/verify-nin/route.ts`, sets `user.nin.status` and `user.verifiedBadge`. The exact
request/response shape should be confirmed against Youverify's current docs before going live —
implemented from the commonly documented v2 API shape, not a live-tested integration. Only NIN is
wired up; Youverify also supports BVN, driver's license, passport, voter's card, and vNIN via
parallel endpoints (`/v2/api/identity/ng/{type}`) if broader document support is wanted later.

Any verified account (tenant or landlord) gets `verifiedBadge: true` and shows a blue checkmark
(`src/components/verified-badge.tsx`) wherever their name appears — landlord profiles, listing
pages, their own dashboard. Verification unlocks two gated actions:

- **Tenants** can browse, subscribe, and contact Reallow about a listing without verifying, but
  `POST /api/inspections/book` and the booking UI on `/listings/[id]` both require
  `verifiedBadge: true` — enforced server-side, not just hidden in the UI.
- **Landlords** must verify before they can list a property at all — `POST /api/listings` checks
  `verifiedBadge` and the `/dashboard/landlord/listings/new` page shows a "verify first" screen
  instead of the form when unverified.

`/dashboard/verify-identity` is the shared NIN-entry page for both roles.

**Admin bypass:** `POST /api/admin/listings` (`/dashboard/admin/listings/new`) lets an admin post a
property directly on behalf of an existing landlord account (by email) — no landlord-verification
check, no ₦15,000 fee, no inspection queue, published immediately with `verification.reviewedBy`
set to the admin. This is the one path that skips both the landlord-verification gate and the
normal listing pipeline, by design.

## Not yet built

- Rent/deposit payment collection and the full "completed transaction" lifecycle (reviews currently
  key off agreement signing instead)
- FAQ/knowledge base content for the support flow
- Sorting on `/listings` (filtering + map are built, see above)
- Email/SMS delivery for saved-search notifications — currently in-app only
  (`FIREBASE_SERVER_KEY`/`RESEND_API_KEY`/`TERMII_API_KEY` are unconfigured)
- Recurring billing renewal automation is implemented but unverified against live Paystack webhook
  payloads — see the Monetization section above
- Minimum lease term (12 months, `MINIMUM_LEASE_TERM_MONTHS` in
  `src/lib/listing-verification.ts`) is enforced on new agreements but is a single platform-wide
  constant, not configurable from the admin panel

## Deploying

Deploy on Vercel; set the environment variables from `.env.example` in the Vercel project
settings, and point the Paystack webhook at the deployed URL
(`/api/payments/paystack/webhook`).
