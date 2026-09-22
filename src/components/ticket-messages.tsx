import type { SupportTicket } from "@/types/models";

// `viewerId` decides the "You" label — a ticket is always between its own creator and
// Reallow staff, so showing the raw stored account role here (as this used to) was both
// confusing (a message from yourself labelled "landlord" or "tenant" reads as someone
// else) and, since one account can now be both, not even a reliable way to tell who's who.
export function TicketMessages({
  messages,
  viewerId,
}: {
  messages: SupportTicket["messages"];
  viewerId: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {messages.map((message, index) => {
        const isStaff = message.senderRole === "admin" || message.senderRole === "support";
        const isViewer = message.senderId.toString() === viewerId;
        const label = isStaff ? "Reallow" : isViewer ? "You" : "them";
        return (
          <div
            key={index}
            className={`rounded-lg border p-3 text-sm ${
              isStaff
                ? "border-transparent bg-clay text-white"
                : "border-line"
            }`}
          >
            <p className="text-xs opacity-70">
              {label} · {new Date(message.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 break-words">{message.body}</p>
          </div>
        );
      })}
    </div>
  );
}
