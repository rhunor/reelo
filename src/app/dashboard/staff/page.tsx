import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { CheckInButton } from "@/components/check-in-button";
import { StaffMediaUploader } from "@/components/staff-media-uploader";
import { toggleVerificationTask, completeInspectionVisit } from "@/app/dashboard/staff/actions";
import { DashboardHeader, StatGrid } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

const TASKS: { key: "videoOfProperty" | "videoOfRoad" | "photos"; label: string }[] = [
  { key: "videoOfProperty", label: "Video of the property" },
  { key: "videoOfRoad", label: "Video of the road to the property" },
  { key: "photos", label: "Photos of the property" },
];

export default async function StaffDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { properties, users, inspectionBookings } = await getCollections();

  const [pendingListings, confirmedBookings] = await Promise.all([
    properties
      .find({ status: "pending_verification", "verification.scheduledFor": { $exists: true } })
      .sort({ "verification.scheduledFor": 1 })
      .toArray(),
    inspectionBookings.find({ status: "confirmed" }).sort({ scheduledFor: 1 }).toArray(),
  ]);

  const landlordIds = pendingListings.map((l) => l.landlordId);
  const tenantIds = confirmedBookings.map((b) => b.tenantId);
  const bookingListingIds = confirmedBookings.map((b) => b.listingId);

  const [relatedUsers, bookingListings] = await Promise.all([
    users.find({ _id: { $in: [...landlordIds, ...tenantIds] } }).toArray(),
    bookingListingIds.length ? properties.find({ _id: { $in: bookingListingIds } }).toArray() : [],
  ]);
  const userById = new Map(relatedUsers.map((u) => [u._id!.toString(), u]));
  const listingById = new Map(
    [...pendingListings, ...bookingListings].map((l) => [l._id!.toString(), l]),
  );

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <DashboardHeader eyebrow="Staff" title="Your visits" />

      <StatGrid
        stats={[
          { label: "Property verifications", value: pendingListings.length },
          { label: "Tenant inspections", value: confirmedBookings.length },
        ]}
      />

      <h2 className="mt-10 text-lg font-semibold">Property verification visits</h2>
      {pendingListings.length === 0 && <p className="mt-4 text-foreground/50">Nothing scheduled.</p>}
      <div className="mt-4 flex flex-col gap-4">
        {pendingListings.map((listing) => {
          const landlord = userById.get(listing.landlordId.toString());
          const tasks = listing.verification.tasks ?? {
            videoOfProperty: false,
            videoOfRoad: false,
            photos: false,
          };

          return (
            <div key={listing._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="font-medium break-words">{listing.title}</p>
              <p className="mt-1 text-sm text-foreground/70">
                {listing.verification.scheduledFor &&
                  new Date(listing.verification.scheduledFor).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                Landlord: {landlord?.name ?? "Unknown"}
                {landlord?.phone && ` · ${landlord.phone}`}
              </p>
              <p className="mt-1 text-sm text-foreground/70 break-words">
                {listing.fullAddress ?? `${listing.location.city}, ${listing.location.state}`}
              </p>

              <div className="mt-3 flex flex-col gap-1">
                {TASKS.map((task) => (
                  <form key={task.key} action={toggleVerificationTask}>
                    <input type="hidden" name="listingId" value={listing._id!.toString()} />
                    <input type="hidden" name="task" value={task.key} />
                    <button
                      type="submit"
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                        tasks[task.key] ? "border-verified bg-verified/5 text-verified" : "border-line"
                      }`}
                    >
                      <span>{tasks[task.key] ? "✓" : "○"}</span>
                      {task.label}
                    </button>
                  </form>
                ))}
              </div>

              <StaffMediaUploader listingId={listing._id!.toString()} />

              {!listing.verification.checkedInAt && (
                <div className="mt-3">
                  <CheckInButton listingId={listing._id!.toString()} />
                </div>
              )}
              {listing.verification.checkedInAt && (
                <p className="mt-3 text-sm text-verified">
                  Checked in {new Date(listing.verification.checkedInAt).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Tenant inspection visits</h2>
      {confirmedBookings.length === 0 && <p className="mt-4 text-foreground/50">Nothing scheduled.</p>}
      <div className="mt-4 flex flex-col gap-4">
        {confirmedBookings.map((booking) => {
          const tenant = userById.get(booking.tenantId.toString());
          const listing = listingById.get(booking.listingId.toString());
          return (
            <div key={booking._id!.toString()} className="rounded-lg border border-line p-4">
              <p className="font-medium">
                {booking.scheduledFor && new Date(booking.scheduledFor).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                Tenant: {tenant?.name ?? "Unknown"}
                {tenant?.phone && ` · ${tenant.phone}`}
              </p>
              {listing && (
                <p className="mt-1 text-sm text-foreground/70 break-words">
                  {listing.fullAddress ?? `${listing.location.city}, ${listing.location.state}`}
                </p>
              )}
              <form action={completeInspectionVisit} className="mt-3">
                <input type="hidden" name="bookingId" value={booking._id!.toString()} />
                <button
                  type="submit"
                  className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white"
                >
                  Mark inspection completed
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
