import Link from "next/link";

// After an application is accepted, both sides book from the dashboard's Meetings window.
export function BookMeetingLinks({ ticketId }: { ticketId: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Link
        href={`/dashboard?panel=meetings&ticket=${ticketId}&kind=inspection`}
        className="flex h-9 items-center rounded-full bg-clay px-4 text-sm font-medium text-white"
      >
        Book inspection
      </Link>
      <Link
        href={`/dashboard?panel=meetings&ticket=${ticketId}&kind=meeting`}
        className="flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-clay hover:text-clay"
      >
        Book meeting
      </Link>
    </div>
  );
}
