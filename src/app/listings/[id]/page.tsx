import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { InspectionBookingForm } from "@/components/inspection-booking-form";
import { ContactReallowForm } from "@/components/contact-reallow-form";
import { ListingsMap } from "@/components/listings-map";
import { VerifiedBadge } from "@/components/verified-badge";
import { Reveal } from "@/components/reveal";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const { properties, users } = await getCollections();
  const listing = await properties.findOne({ _id: new ObjectId(id) });
  if (!listing) notFound();

  const landlord = await users.findOne({ _id: listing.landlordId });

  const session = await auth();
  const currentUser = session?.user
    ? await users.findOne({ _id: new ObjectId(session.user.id) })
    : null;

  const isVerified = Boolean(currentUser?.verifiedBadge);
  const canBook = currentUser ? isVerified : false;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
        <Image src={listing.photoUrls[0]} alt={listing.title} fill priority className="object-cover" />
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        <Reveal direction="left" distance={32} className="lg:col-span-2">
          <h1 className="text-3xl font-semibold tracking-tight">{listing.title}</h1>
          <p className="mt-1 text-foreground/60">
            {listing.location.area ? `${listing.location.area}, ` : ""}
            {listing.location.city}, {listing.location.state}
          </p>
          <p className="mt-4 font-mono text-2xl font-medium">
            ₦{listing.priceNGN.toLocaleString()}
            {listing.listingType === "rent" ? <span className="text-base text-foreground/50">/year</span> : null}
          </p>
          <p className="mt-6 leading-relaxed text-foreground/80 break-words">{listing.description}</p>

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
                  Log in to contact Reallow about this property and book an inspection — it&apos;s
                  free.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-clay px-5 text-sm font-medium text-white hover:opacity-90"
                >
                  Log in
                </Link>
              </>
            )}

            {session?.user && session.user.role !== "tenant" && (
              <p className="mt-3 text-sm text-foreground/70">
                Inspection booking and inquiries are available to tenant accounts.
              </p>
            )}

            {session?.user && session.user.role === "tenant" && (
              <>
                <ContactReallowForm
                  listingId={listing._id!.toString()}
                  subject={`Inquiry about ${listing.title}`}
                />

                <div className="mt-6 border-t border-line pt-4">
                  {canBook ? (
                    <InspectionBookingForm listingId={listing._id!.toString()} />
                  ) : (
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
                  )}
                </div>
              </>
            )}
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
