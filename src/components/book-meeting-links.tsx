import Link from "next/link";
import { getT } from "@/lib/i18n/server";

// After an application is accepted, both sides book a meeting from the dashboard's Meetings
// window. No separate inspection: Reallow inspects every listing before it goes live.
export async function BookMeetingLinks({ ticketId }: { ticketId: string }) {
  const t = await getT();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Link
        href={`/dashboard?panel=meetings&ticket=${ticketId}`}
        className="flex h-9 items-center rounded-full bg-clay px-4 text-sm font-medium text-white"
      >
        {t("meetings.bookMeeting")}
      </Link>
    </div>
  );
}
