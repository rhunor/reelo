import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { VerifiedBadge } from "@/components/verified-badge";
import { PreferCandidateButton } from "@/components/prefer-candidate-button";

export const dynamic = "force-dynamic";

export default async function LandlordCandidatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { properties, tickets, users } = await getCollections();

  const listings = await properties.find({ landlordId: new ObjectId(session.user.id) }).toArray();
  const listingIds = listings.map((listing) => listing._id!);

  const inquiries =
    listingIds.length === 0
      ? []
      : await tickets
          .find({ listingId: { $in: listingIds }, userRole: "tenant" })
          .sort({ createdAt: -1 })
          .toArray();

  const tenantIds = [...new Set(inquiries.map((ticket) => ticket.userId.toString()))].map(
    (id) => new ObjectId(id),
  );
  const tenants = tenantIds.length === 0 ? [] : await users.find({ _id: { $in: tenantIds } }).toArray();
  const tenantById = new Map(tenants.map((tenant) => [tenant._id!.toString(), tenant]));
  const listingById = new Map(listings.map((listing) => [listing._id!.toString(), listing]));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Interested tenants</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Everyone who&apos;s asked Reallow about one of your listings. Verification status always
        shows; the rest of a tenant&apos;s profile only shows if they&apos;ve chosen to share it.
        Marking a preference tells Reallow who you&apos;d like to move forward with — we handle
        the rest.
      </p>

      {inquiries.length === 0 && (
        <p className="mt-8 text-foreground/50">No inquiries yet.</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {inquiries.map((ticket) => {
          const tenant = tenantById.get(ticket.userId.toString());
          const listing = listingById.get(ticket.listingId!.toString());
          const profile = tenant?.tenantProfile?.visibleToLandlords ? tenant.tenantProfile : null;

          return (
            <div key={ticket._id!.toString()} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-foreground/50">{listing?.title ?? "A listing"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-medium">{profile ? tenant?.name : "Interested tenant"}</p>
                    {tenant?.verifiedBadge ? (
                      <VerifiedBadge />
                    ) : (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                        Not verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {profile.occupation && (
                    <div>
                      <dt className="text-foreground/50">Occupation</dt>
                      <dd className="mt-0.5">{profile.occupation}</dd>
                    </div>
                  )}
                  {profile.monthlyIncomeNGN !== undefined && (
                    <div>
                      <dt className="text-foreground/50">Monthly income</dt>
                      <dd className="mt-0.5">₦{profile.monthlyIncomeNGN.toLocaleString()}</dd>
                    </div>
                  )}
                  {profile.householdSize !== undefined && (
                    <div>
                      <dt className="text-foreground/50">Household size</dt>
                      <dd className="mt-0.5">{profile.householdSize}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-foreground/50">
                  This tenant hasn&apos;t shared their profile.
                </p>
              )}
              {profile?.aboutMe && <p className="mt-2 text-sm text-foreground/70">{profile.aboutMe}</p>}

              <div className="mt-4">
                <PreferCandidateButton
                  ticketId={ticket._id!.toString()}
                  preferred={Boolean(ticket.landlordPreferred)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
