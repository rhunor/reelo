import Link from "next/link";
import type { Agreement } from "@/types/models";

export function ActiveTenancies({ agreements }: { agreements: Agreement[] }) {
  const active = agreements.filter(
    (agreement) =>
      agreement.status === "fully_signed" &&
      !(agreement.terminatedByLandlord && agreement.terminatedByTenant),
  );

  if (active.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-sm font-medium">Active tenancies</p>
      <div className="mt-2 flex flex-col gap-2">
        {active.map((agreement) => (
          <Link
            key={agreement._id!.toString()}
            href={`/agreements/${agreement._id}`}
            className="flex items-center justify-between rounded-lg border border-line p-3 text-sm"
          >
            <span>₦{agreement.terms.rentNGN.toLocaleString()}/year</span>
            <span className="text-foreground/50">
              {agreement.terminatedByLandlord || agreement.terminatedByTenant
                ? "Ending — awaiting other party"
                : "Ongoing"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
