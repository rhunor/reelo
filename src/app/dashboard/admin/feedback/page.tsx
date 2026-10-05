import Link from "next/link";
import { getCollections } from "@/lib/db";
import { formatLagos } from "@/lib/time";

export const dynamic = "force-dynamic";

const TARGET_LABEL = {
  meeting: "Meeting / inspection",
  inspection_booking: "Inspection (older booking)",
  verification: "Verification visit",
} as const;

// Ratings people leave on past meetings, inspections, and verification visits — the main
// signal on how field agents are doing. Low ratings first.
export default async function AdminFeedbackPage() {
  const { meetingFeedback, users, properties } = await getCollections();
  const entries = await meetingFeedback.find({}).sort({ rating: 1, createdAt: -1 }).limit(300).toArray();

  const [authors, listings] = await Promise.all([
    entries.length ? users.find({ _id: { $in: entries.map((e) => e.userId) } }).toArray() : [],
    entries.length
      ? properties.find({ _id: { $in: entries.flatMap((e) => (e.listingId ? [e.listingId] : [])) } }).toArray()
      : [],
  ]);
  const authorById = new Map(authors.map((u) => [u._id!.toString(), u]));
  const listingById = new Map(listings.map((l) => [l._id!.toString(), l]));
  const average = entries.length ? entries.reduce((s, e) => s + e.rating, 0) / entries.length : 0;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <Link href="/dashboard/admin" className="text-sm text-foreground/60 hover:text-clay">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Meeting feedback</h1>
      <p className="mt-1 text-sm text-foreground/60">
        {entries.length
          ? `${entries.length} rating${entries.length === 1 ? "" : "s"} · average ${average.toFixed(1)} / 5 · lowest first`
          : "No feedback yet."}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {entries.map((entry) => {
          const author = authorById.get(entry.userId.toString());
          const listing = entry.listingId ? listingById.get(entry.listingId.toString()) : undefined;
          return (
            <div key={entry._id!.toString()} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`text-lg ${entry.rating <= 2 ? "text-red-600" : "text-amber-500"}`}>
                  {"★".repeat(entry.rating)}
                  <span className="text-foreground/20">{"★".repeat(5 - entry.rating)}</span>
                </p>
                <p className="text-xs text-foreground/50">{formatLagos(entry.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm text-foreground/70">
                {TARGET_LABEL[entry.targetType]}
                {listing ? ` · ${listing.title}` : ""} · from {author?.name ?? "Unknown"}
                {author?.phone ? ` (${author.phone})` : ""}
              </p>
              {entry.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {entry.comment && <p className="mt-2 text-sm break-words">{entry.comment}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
