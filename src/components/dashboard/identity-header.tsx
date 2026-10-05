import Link from "next/link";
import type { ReactNode } from "react";
import { ReferralCodeCard } from "@/components/dashboard/referral-code-card";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import type { User } from "@/types/models";

const ROLE_BADGE: Partial<Record<User["role"], string>> = {
  staff: "Field staff",
  support: "Support",
  admin: "Admin",
};

// The top of every dashboard — same look whatever the role, with a role badge for staff.
export function IdentityHeader({
  user,
  greeting,
  action,
}: {
  user: Pick<User, "name" | "role" | "verifiedBadge" | "referralCode" | "profile">;
  greeting: string;
  action?: ReactNode;
}) {
  const roleBadge = ROLE_BADGE[user.role];

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-line bg-gradient-to-br from-clay/[0.07] to-transparent p-5 sm:flex-row sm:items-center sm:p-7">
      <Link href="/dashboard/settings#profile" className="shrink-0" aria-label="Your profile picture">
        <UserAvatar name={user.name} pictureUrl={user.profile?.profilePictureUrl} size={72} className="ring-4 ring-background" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground/60">{greeting}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{user.name}</h1>
          {user.verifiedBadge && !roleBadge && <VerifiedBadge />}
          {roleBadge && (
            <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-background uppercase">
              {roleBadge}
            </span>
          )}
        </div>
        {user.referralCode && (
          <div className="mt-3">
            <ReferralCodeCard code={user.referralCode} />
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}
