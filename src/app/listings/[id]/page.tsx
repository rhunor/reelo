import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { BookMeetingLinks } from "@/components/book-meeting-links";
import { InspectionNegotiation } from "@/components/inspection-negotiation";
import { ApplyForListingButton } from "@/components/apply-for-listing";
import { SaveListingButton } from "@/components/save-listing-button";
import { ReportButton } from "@/components/report-button";
import { ListingsMap } from "@/components/listings-map";
import { PropertyPhotoHero, PropertyPhotoThumbnail } from "@/components/property-photo-gallery";
import { VerifiedBadge } from "@/components/verified-badge";
import { Reveal } from "@/components/reveal";
import { computeListingCostBreakdown, formatRate, getInspectionFee } from "@/lib/fees";
import { MINIMUM_LEASE_TERM_MONTHS } from "@/lib/listing-verification";
import { isStaffRole } from "@/lib/roles";
import { redactContactInfo } from "@/lib/contact-guard";

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
  const isStaffViewer = isStaffRole(session?.user?.role);
  // Only live listings are public. Rented/sold pages stay up (saying so) for anyone with the
  // link; drafts, unverified, rejected, and taken-down listings are owner/staff only.
  const isClosed = listing.status === "rented" || listing.status === "sold";
  if (listing.status !== "published" && !isClosed && !isOwnListing && !isStaffViewer) notFound();
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

  const isRent = listing.listingType === "rent";
  const costBreakdown = computeListingCostBreakdown({
    listingType: listing.listingType,
    priceNGN: listing.priceNGN,
    cautionFeeNGN: listing.depositNGN,
    estateChargeNGN: listing.estateChargeNGN,
  });
  const minimumTermMonths = listing.minimumTermMonths ?? MINIMUM_LEASE_TERM_MONTHS;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <PropertyPhotoHero photos={listing.photoUrls} title={listing.title} />

      {listing.status !== "published" && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            isClosed ? "border-line bg-foreground/5" : "border-amber-500/40 bg-amber-500/10"
          }`}
        >
          {isClosed ? (
            <p className="font-medium">
              This property has been {listing.status === "sold" ? "sold" : "rented"}.{" "}
              <Link href="/listings" className="text-clay underline">
                See similar properties
              </Link>
            </p>
          ) : listing.status === "archived" ? (
            <p>
              <span className="font-medium">Not visible to the public</span> — taken down by Reallow
              {listing.takenDown?.reason === "owner_blocked" ? " because the owner's account is blocked" : ""}
              {listing.takenDown?.note ? `: ${listing.takenDown.note}` : "."}
            </p>
          ) : (
            <p>
              <span className="font-medium">Not visible to the public yet</span> — only you and Reallow can see this
              page until it&apos;s verified and approved.
            </p>
          )}
        </div>
      )}

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

          {(
            <div className="mt-4 rounded-2xl border border-line p-4">
              <p className="text-sm font-medium">What you&apos;d pay in total</p>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-foreground/70">{isRent ? "Rent (per year)" : "Sale price"}</dt>
                  <dd className="font-mono">₦{costBreakdown.priceNGN.toLocaleString()}</dd>
                </div>
                {costBreakdown.cautionFeeNGN > 0 && (
                  <div className="flex items-baseline justify-between">
                    <dt className="text-foreground/70">+ Caution fee</dt>
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
                    + Reallow service charge ({formatRate(costBreakdown.serviceChargeRate)})
                  </dt>
                  <dd className="font-mono">₦{costBreakdown.serviceChargeNGN.toLocaleString()}</dd>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2 font-medium">
                  <dt>Total payable</dt>
                  <dd className="font-mono">₦{costBreakdown.totalNGN.toLocaleString()}</dd>
                </div>
              </dl>
              {isRent && (
                <p className="mt-3 text-xs text-foreground/50">
                  Minimum tenancy: {minimumTermMonths} month{minimumTermMonths === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          )}

          {listing.description && (
            <p className="mt-6 leading-relaxed text-foreground/80 break-words">{redactContactInfo(listing.description)}</p>
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
              <p className="mt-1 text-sm text-foreground/70 break-words">{redactContactInfo(listing.tenantPreferences)}</p>
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
            <p className="font-medium">Interested in this property?</p>
            <p className="mt-1 text-xs text-foreground/50">
              Landlords and applicants never contact each other or see each other&apos;s phone
              number or email — Reallow arranges everything.
            </p>

            {!isOwnListing && !isStaffRole(session?.user?.role) && listing.status === "published" && (
              <div className="mt-4">
                <SaveListingButton
                  listingId={listing._id!.toString()}
                  initiallySaved={Boolean(currentUser?.savedListingIds?.some((saved) => saved.equals(listing._id!)))}
                  signedIn={Boolean(session?.user)}
                />
              </div>
            )}

            {!session?.user && (
              <>
                <p className="mt-3 text-sm text-foreground/70">
                  Log in to apply — it&apos;s free. Once the landlord accepts your application you
                  can book an inspection or a meeting.
                </p>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/listings/${listing._id}`)}`}
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

            {canApply && !existingTicket && listing.status === "published" && (
              isVerified ? (
                <ApplyForListingButton listingId={listing._id!.toString()} />
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-foreground/70">Verify your identity to apply for this property.</p>
                  <Link
                    href="/dashboard/verify-identity"
                    className="mt-3 inline-flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
                  >
                    Verify your identity
                  </Link>
                </div>
              )
            )}

            {existingTicket && decision === undefined && (
              <p className="mt-3 text-sm text-foreground/70">
                Application sent — waiting on the landlord&apos;s decision. We&apos;ll notify you.{" "}
                <Link href={`/dashboard/tenant/tickets/${existingTicket._id}`} className="underline">
                  Questions? Message Reallow
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
                      The landlord accepted your application.
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">
                      Book an inspection (₦{inspectionFeeNGN.toLocaleString()}, with a Reallow agent) or a
                      free meeting — pick the day in your Meetings calendar.
                    </p>
                    <BookMeetingLinks ticketId={existingTicket._id!.toString()} />
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
