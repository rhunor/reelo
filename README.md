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
  `agreements/[id]/` (shared tenancy-agreement view/sign/pay page), `landlords/[id]/` (public
  landlord profile), `api/`
- `src/auth.config.ts` — edge-safe Auth.js config (RBAC `authorized` callback used by
  `src/proxy.ts`, no DB/bcrypt so it can run in the edge runtime)
- `src/auth.ts` — full Auth.js config (Credentials provider backed by the `users` collection,
  JWT session carrying role/verified badge)
- `src/lib/mongodb.ts` — MongoDB client singleton (Vercel-serverless-safe connection reuse)
- `src/lib/db.ts` — typed collection getters
- `src/lib/listing-verification.ts` — the ₦15,000 landlord listing-verification fee constant and
  the minimum lease term
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

Reallow is free for tenants and landlords to use — browsing, contacting Reallow about a listing,
booking inspections, signing agreements, none of it is paywalled or subscription-gated. The only
money that ever moves through the app is:

1. **Landlord listing-verification fee (₦15,000, one-off per listing)** — see below.
2. **Rent & deposit payments** — see "Rent & deposit payments" below.

There is no tenant pricing page or subscription tier system.

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

- `/listings/[id]` — any signed-in tenant sees `src/components/contact-reallow-form.tsx` (creates a
  listing-scoped ticket) and the inspection-booking form, free of charge. Logged-out visitors see a
  login CTA. Inspection booking additionally requires `verifiedBadge: true`, checked **fresh from
  MongoDB**, not the session JWT.
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

## Rent & deposit payments

Once an agreement is `fully_signed`, the tenant pays rent + deposit together in one Paystack
transaction, straight into Reallow's own account (`src/components/agreement-pay-button.tsx` →
`POST /api/agreements/[id]/pay-checkout`). `Agreement.payment.status` tracks the escrow state:

`unpaid` → (tenant pays) → `paid_to_reallow` → (Reallow staff bank-transfers the landlord,
out-of-band) → `paid_out_to_landlord`

- `POST /api/agreements/[id]/pay-checkout` — tenant-only, requires `fully_signed` and
  `payment.status === "unpaid"`, initializes a Paystack transaction for
  `rentNGN + depositNGN` with `metadata.kind = "agreement_payment"`.
- `/api/payments/paystack/webhook` — on `charge.success` with that metadata, records a `rent` and
  a `deposit` `Transaction` (each linked to the agreement) and flips `payment.status` to
  `paid_to_reallow`. Guarded against duplicate webhook delivery by checking the current status
  before writing.
- `markAgreementPaidOut` (`src/app/dashboard/admin/actions.ts`) — admin-only server action, shown
  as a button on `/agreements/[id]` once `payment.status === "paid_to_reallow"`. This **only**
  records that Reallow already sent the money to the landlord by bank transfer; it never moves
  money itself — see "Payment custody" below for why no Paystack split/subaccount is used instead.
- `/agreements/[id]` shows the live payment state to whoever's looking at it: a pay button for the
  tenant, an "awaiting payout" note for admin/support with the mark-paid-out button, and a "paid
  out" confirmation once done. `/dashboard/admin/agreements` and
  `/dashboard/landlord/agreements` show a small payout-pending/paid-out badge per agreement.

## Reviews & trust score

Reviews are gated on `Agreement.payment.status !== "unpaid"` — rent & deposit actually paid to
Reallow, not just both signatures — since that's the real "completed transaction" signal. Once
paid, each party can rate the other once via `POST /api/reviews`, which recomputes
`User.ratingAverage`/`ratingCount`. Landlord ratings are public on `/landlords/[id]`; tenant
ratings are only shown to the tenant themselves on `/dashboard/tenant` (tenants aren't publicly
browsable).

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

All payments (the ₦15,000 listing-verification fee and rent/deposit) settle into Reallow's own
Paystack account only — see the guardrail comment at the top of `src/lib/paystack.ts`. No Paystack
subaccount/`split_code` is used anywhere. Payouts to landlords happen out-of-band (bank transfer,
initiated and executed by Reallow staff manually) — the app only *records* that a payout happened
(`markAgreementPaidOut`, see "Rent & deposit payments" above), it never automates the transfer
itself. Don't add split-payment params or a payout-automation integration without deliberately
revisiting this — it's a deliberate policy, not a gap.

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

- **Tenants** can browse and contact Reallow about a listing without verifying, but
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

## Theming (light/dark)

Colors are CSS variables (`--paper`, `--ink`, `--clay`, `--verified`, `--gold`, `--line`) set in
`src/app/globals.css` and mapped to Tailwind tokens (`bg-background`, `text-foreground`,
`border-line`, `text-clay`, etc.) via `@theme inline` — components use those tokens, never raw
hex values, so theming only ever needs to change the variables in one place.

By default the site follows the OS's light/dark preference (`prefers-color-scheme`).
`src/components/theme-toggle.tsx` (in the header) lets a visitor override that explicitly — it
stamps `data-theme="light"`/`"dark"` on `<html>` and persists the choice to `localStorage`
(`reallow-theme`), which always wins over the OS preference. An inline script in
`src/app/layout.tsx` applies a stored choice before hydration so the page never flashes the wrong
theme on load.

## Deploying

Deploy on Vercel; set the environment variables from `.env.example` in the Vercel project
settings, and point the Paystack webhook at the deployed URL
(`/api/payments/paystack/webhook`).
