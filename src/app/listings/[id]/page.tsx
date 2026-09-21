import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { InspectionBookingForm } from "@/components/inspection-booking-form";
import { InspectionNegotiation } from "@/components/inspection-negotiation";
import { ContactReallowForm } from "@/components/contact-reallow-form";
import { ReportButton } from "@/components/report-button";
import { ListingsMap } from "@/components/listings-map";
import { PropertyPhotoHero, PropertyPhotoThumbnail } from "@/components/property-photo-gallery";
import { VerifiedBadge } from "@/components/verified-badge";
import { Reveal } from "@/components/reveal";
import { computeListingCostBreakdown, getAgencyFeeRate, getInspectionFee } from "@/lib/fees";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";
import { isStaffRole } from "@/lib/roles";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const { properties, users, tickets, inspectionBookings } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(id) });
  if (!listing) notFound();

  const landlord = await users.findOne({ _id: listing.landlordId });

  const session = await auth();
  const currentUser = session?.user
    ? await users.findOne({ _id: new ObjectId(session.user.id) })
    : null;

  const isVerified = Boolean(currentUser?.verifiedBadge);
  const isOwnListing = session?.user?.id === listing.landlordId.toString();
  const canApply = Boolean(session?.user) && !isStaffRole(session?.user?.role) && !isOwnListing;

  // A given user only ever has (at most) one inquiry ticket per listing — used both to
  // avoid showing the "apply" form again and to gate the paid inspection-booking step on
  // the landlord's decision. Not role-gated: anyone (other than this listing's own
  // landlord, or staff) can apply now.
  const existingTicket = canApply
    ? await tickets.findOne({ userId: new ObjectId(session!.user.id), listingId: listing._id })
    : null;
  const decision =
    existingTicket?.landlordDecision ?? (existingTicket?.landlordPreferred ? "approved" : undefined);
  const existingBooking = existingTicket
    ? await inspectionBookings.findOne({ ticketId: existingTicket._id })
    : null;
  const inspectionFeeNGN = getInspectionFee(listing.location.city);

  const costBreakdown =
    listing.listingType === "rent"
      ? computeListingCostBreakdown({
          rentNGN: listing.priceNGN,
          cautionFeeNGN: listing.depositNGN,
          estateChargeNGN: listing.estateChargeNGN,
          state: listing.location.state,
        })
      : null;
  const minimumTermMonths = listing.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <PropertyPhotoHero photos={listing.photoUrls} title={listing.title} />

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        <Reveal direction="left" distance={32} className="lg:col-span-2">
          <h1 className="text-3xl font-semibold tracking-tight">{listing.title}</h1>
          <p className="mt-1 text-foreground/60">
            {listing.location.area ? `${listing.location.area}, ` : ""}
            {listing.location.city}, {listing.location.state}
          </p>
          {session?.user && (
            <div className="mt-2">
              <ReportButton targetType="listing" targetId={listing._id!.toString()} label="Report this listing" />
            </div>
          )}
          <p className="mt-4 font-mono text-2xl font-medium">
            ₦{listing.priceNGN.toLocaleString()}
            {listing.listingType === "rent" ? <span className="text-base text-foreground/50">/year</span> : null}
          </p>

          {costBreakdown && (
            <div className="mt-4 rounded-2xl border border-line p-4">
              <p className="text-sm font-medium">What you&apos;d pay in total</p>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-foreground/70">Rent</dt>
                  <dd className="font-mono">₦{costBreakdown.rentNGN.toLocaleString()}</dd>
                </div>
                {costBreakdown.cautionFeeNGN > 0 && (
                  <div className="flex items-baseline justify-between">
                    <dt className="text-foreground/70">+ Caution fee (refundable)</dt>
                    <dd className="font-mono">₦{costBreakdown.cautionFeeNGN.toLocaleString()}</dd>
                  </div>
                )}
                {costBreakdown.estateChargeNGN > 0 && (
                  <div className="flex items-baseline justify-between">
                    <dt className="text-foreground/70">+ Estate charge</dt>
                    <dd className="font-mono">₦{costBreakdown.estateChargeNGN.toLocaleString()}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <dt className="text-foreground/70">
                    + Reallow agency fee ({Math.round(getAgencyFeeRate(listing.location.state) * 100)}%)
                  </dt>
                  <dd className="font-mono">₦{costBreakdown.agencyFeeNGN.toLocaleString()}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-foreground/70">+ Legal fee</dt>
                  <dd className="font-mono">₦{costBreakdown.legalFeeNGN.toLocaleString()}</dd>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2 font-medium">
                  <dt>Total payable</dt>
                  <dd className="font-mono">₦{costBreakdown.totalNGN.toLocaleString()}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-foreground/50">
                Caution fee is refundable and held by Reallow until move-out, provided there&apos;s
                no damage. Minimum tenancy: {minimumTermMonths} months.
              </p>
            </div>
          )}

          {listing.dealBreakers && listing.dealBreakers.length > 0 && (
            <div className="mt-4 rounded-2xl border border-clay/40 bg-clay/5 p-4">
              <p className="text-sm font-medium">Deal breakers</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {listing.dealBreakers.map((rule) => (
                  <li
                    key={rule}
                    className="rounded-full border border-clay/40 px-3 py-1 text-xs font-medium text-clay"
                  >
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {listing.description && (
            <p className="mt-6 leading-relaxed text-foreground/80 break-words">{listing.description}</p>
          )}

          {(listing.photoUrls.length > 1 || listing.videoUrls.length > 0) && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {listing.photoUrls.slice(1).map((url, index) => (
                <PropertyPhotoThumbnail
                  key={url}
                  url={url}
                  index={index + 1}
                  photos={listing.photoUrls}
                  title={listing.title}
                />
              ))}
              {listing.videoUrls.map((url) => (
                <video
                  key={url}
                  src={url}
                  controls
                  className="aspect-video w-full rounded-xl bg-black object-cover"
                />
              ))}
            </div>
          )}

          {listing.tenantPreferences && (
            <div className="mt-6 rounded-2xl border border-line p-4">
              <p className="text-sm font-medium">Who the landlord is looking for</p>
              <p className="mt-1 text-sm text-foreground/70 break-words">{listing.tenantPreferences}</p>
            </div>
          )}

          {listing.location.coordinates && (
            <div className="mt-6 h-80 overflow-hidden rounded-2xl">
              <ListingsMap
                listings={[
                  {
                    id: listing._id!.toString(),
                    title: listing.title,
                    priceNGN: listing.priceNGN,
                    listingType: listing.listingType,
                    lng: listing.location.coordinates[0],
                    lat: listing.location.coordinates[1],
                  },
                ]}
              />
            </div>
          )}

          {landlord && (
            <Link
              href={`/landlords/${landlord._id}`}
              className="mt-6 inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-clay"
            >
              Listed by {landlord.name}
              {landlord.verifiedBadge && <VerifiedBadge />}
            </Link>
          )}
        </Reveal>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-line p-6 lg:sticky lg:top-24">
            <Reveal direction="right" distance={28}>
            <p className="font-medium">Contact Reallow &amp; book inspection</p>
            <p className="mt-1 text-xs text-foreground/50">
              Landlords and tenants never contact each other directly — Reallow coordinates
              everything.
            </p>

            {!session?.user && (
              <>
                <p className="mt-3 text-sm text-foreground/70">
                  Log in to contact Reallow about this property — it&apos;s free to ask. A paid
                  physical inspection is available once the landlord approves your interest.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
                >
                  Log in
                </Link>
              </>
            )}

            {session?.user && isOwnListing && (
              <p className="mt-3 text-sm text-foreground/70">This is your own listing.</p>
            )}

            {session?.user && !isOwnListing && isStaffRole(session.user.role) && (
              <>
                <p className="mt-3 text-sm text-foreground/70">
                  Inspection booking and property inquiries aren&apos;t available on staff accounts.
                  Need something from Reallow?
                </p>
                <Link
                  href="/dashboard/landlord/tickets/new"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
                >
                  Contact Reallow
                </Link>
              </>
            )}

            {canApply && !existingTicket && (
              <ContactReallowForm
                listingId={listing._id!.toString()}
                subject={`Inquiry about ${listing.title}`}
              />
            )}

            {existingTicket && decision === undefined && (
              <p className="mt-3 text-sm text-foreground/70">
                Application sent — waiting on the landlord&apos;s decision.{" "}
                <Link href={`/dashboard/tenant/tickets/${existingTicket._id}`} className="underline">
                  View message
                </Link>
              </p>
            )}

            {existingTicket && decision === "declined" && (
              <p className="mt-3 text-sm text-foreground/50">
                The landlord has moved on from this application.
              </p>
            )}

            {existingTicket && decision === "approved" && (
              <div className="mt-6 border-t border-line pt-4">
                {existingBooking ? (
                  <InspectionNegotiation booking={existingBooking} viewerRole="tenant" />
                ) : !isVerified ? (
                  <>
                    <p className="text-sm text-red-600">
                      You can&apos;t book an inspection because your account has not been
                      verified.
                    </p>
                    <Link
                      href="/dashboard/verify-identity"
                      className="mt-4 inline-flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
                    >
                      Verify your identity
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-verified">
                      The landlord approved your application.
                    </p>
                    <InspectionBookingForm
                      ticketId={existingTicket._id!.toString()}
                      feeNGN={inspectionFeeNGN}
                    />
                  </>
                )}
              </div>
            )}

            <Link href="/contact" className="mt-4 inline-block text-xs text-foreground/50 underline">
              Other ways to reach Reallow
            </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
