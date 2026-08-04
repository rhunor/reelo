import type { SupportTicket } from "@/types/models";

export function TicketMessages({ messages }: { messages: SupportTicket["messages"] }) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {messages.map((message, index) => {
        const isStaff = message.senderRole === "admin" || message.senderRole === "support";
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
              {isStaff ? "Reelo" : message.senderRole} · {new Date(message.createdAt).toLocaleString()}
            </p>
            <p className="mt-1">{message.body}</p>
          </div>
        );
      })}
    </div>
  );
}
