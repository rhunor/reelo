import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { addUserNote, adminVerifyUser, banUser, unbanUser } from "@/app/dashboard/admin/actions";
import { UserRoleSelect } from "@/components/user-role-select";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { ROLE_LABEL, isCustomerRole } from "@/lib/roles";
import { formatLagos } from "@/lib/time";
import { TRANSACTION_TYPE_LABEL } from "@/lib/transaction-labels";
import { heardAboutLabel } from "@/lib/acquisition";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line p-5">
      <h2 className="text-sm font-semibold">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-foreground/50">{count}</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-foreground/50">{children}</p>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-foreground/60">{label}</p>
    </div>
  );
}

const naira = (n: number) => `₦${n.toLocaleString()}`;

// Everything one person does on Reallow, in one place — for investigating reports,
// answering support questions, and keeping an eye on staff.
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  const session = await auth();
  const userId = new ObjectId(id);

  const {
    users,
    properties,
    tickets,
    meetings,
    inspectionBookings,
    agreements,
    transactions,
    reports,
    meetingFeedback,
    referralCommissions,
    withdrawalRequests,
  } = await getCollections();

  const user = await users.findOne({ _id: userId });
  if (!user) notFound();

  const [
    ownListings,
    savedListings,
    applications,
    meetingList,
    bookingCount,
    agreementList,
    txns,
    reportsFiled,
    reportsAgainstUser,
    feedbackGiven,
    referredCount,
    commissions,
    withdrawals,
    referrer,
    visitReports,
  ] = await Promise.all([
    properties.find({ landlordId: userId }).sort({ createdAt: -1 }).toArray(),
    user.savedListingIds?.length
      ? properties.find({ _id: { $in: user.savedListingIds } }, { projection: { title: 1, status: 1 } }).toArray()
      : [],
    tickets.find({ userId, listingId: { $exists: true } }).sort({ createdAt: -1 }).toArray(),
    meetings.find({ $or: [{ landlordId: userId }, { tenantId: userId }] }).sort({ createdAt: -1 }).toArray(),
    inspectionBookings.countDocuments({ $or: [{ landlordId: userId }, { tenantId: userId }] }),
    agreements.find({ $or: [{ landlordId: userId }, { tenantId: userId }] }).sort({ createdAt: -1 }).toArray(),
    transactions.find({ $or: [{ payerId: userId }, { payeeId: userId }], status: "success" }).sort({ createdAt: -1 }).limit(50).toArray(),
    reports.find({ reporterId: userId }).sort({ createdAt: -1 }).toArray(),
    reports.find({ targetType: "user", targetId: userId }).sort({ createdAt: -1 }).toArray(),
    meetingFeedback.find({ userId }).sort({ createdAt: -1 }).toArray(),
    users.countDocuments({ referredBy: userId }),
    referralCommissions.find({ referrerId: userId }).toArray(),
    withdrawalRequests.find({ userId }).sort({ createdAt: -1 }).toArray(),
    user.referredBy ? users.findOne({ _id: user.referredBy }, { projection: { name: 1, role: 1 } }) : null,
    properties
      .find({ "verification.agentReport.submittedBy": userId }, { projection: { title: 1, verification: 1, status: 1 } })
      .sort({ "verification.agentReport.submittedAt": -1 })
      .limit(20)
      .toArray(),
  ]);

  const reportsAgainstListings = ownListings.length
    ? await reports.find({ targetType: "listing", targetId: { $in: ownListings.map((l) => l._id!) } }).toArray()
    : [];
  const supportCount = await tickets.countDocuments({ userId, listingId: { $exists: false } });

  const listingIds = [...applications.map((a) => a.listingId!), ...meetingList.map((m) => m.listingId), ...agreementList.map((a) => a.listingId)];
  const relatedListings = listingIds.length
    ? await properties.find({ _id: { $in: listingIds } }, { projection: { title: 1 } }).toArray()
    : [];
  const titleOf = (lid?: ObjectId) =>
    (lid && (relatedListings.find((l) => l._id!.equals(lid)) ?? ownListings.find((l) => l._id!.equals(lid)))?.title) ||
    "a property";

  const paidOut = txns.filter((t) => t.payerId.equals(userId) && t.type !== "wallet_funding").reduce((s, t) => s + t.amountNGN, 0);
  const earned = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.amountNGN, 0);
  const isSelf = session?.user?.id === id;
  const isStaffish = !isCustomerRole(user.role);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/dashboard/admin/users" className="text-sm text-foreground/60 hover:text-clay">
        ← People
      </Link>

      {/* Header */}
      <section className="mt-4 flex flex-col gap-5 rounded-3xl border border-line p-5 sm:flex-row sm:items-start sm:p-7">
        <UserAvatar name={user.name} pictureUrl={user.profile?.profilePictureUrl} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{user.name}</h1>
            {user.verifiedBadge && <VerifiedBadge />}
            <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-background uppercase">
              {ROLE_LABEL[user.role]}
            </span>
            {user.staffBase && (
              <span className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-medium text-clay">📍 {user.staffBase}</span>
            )}
            {user.status === "banned" && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">Blocked</span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground/70">
            {user.email} {user.emailVerified ? "(verified)" : "(not verified)"}
          </p>
          <p className="text-sm text-foreground/70">
            {user.phone ? (
              <a href={`tel:${user.phone}`} className="text-clay underline">
                {user.phone}
              </a>
            ) : (
              "No phone"
            )}
            {user.alternatePhone && (
              <>
                {" · alt "}
                <a href={`tel:${user.alternatePhone}`} className="text-clay underline">
                  {user.alternatePhone}
                </a>
              </>
            )}
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            Joined {formatLagos(user.createdAt)} · last updated {formatLagos(user.updatedAt)} · NIN {user.nin.status} · driver&apos;s licence{" "}
            {user.driversLicence?.status ?? "unverified"}
            {user.referralCode && ` · code ${user.referralCode}`}
          </p>
          <p className="mt-1 text-xs text-foreground/60">
            Heard about Reallow: <span className="font-medium">{heardAboutLabel(user.heardAbout?.source)}</span>
            {user.heardAbout?.detail ? ` — “${user.heardAbout.detail}”` : ""}
          </p>
          {referrer && (
            <p className="mt-1 text-xs text-foreground/60">
              Referred by{" "}
              <Link href={`/dashboard/admin/users/${user.referredBy}`} className="text-clay underline">
                {referrer.name}
              </Link>{" "}
              ({isCustomerRole(referrer.role) ? "user" : "staff"})
            </p>
          )}
          {user.status === "banned" && (
            <p className="mt-2 text-xs text-red-600">
              Blocked{user.bannedAt ? ` ${formatLagos(user.bannedAt)}` : ""}
              {user.bannedReason ? ` — ${user.bannedReason}` : ""}
            </p>
          )}
        </div>
      </section>

      {!user.verifiedBadge && (user.nin.status === "pending" || user.driversLicence?.status === "pending") && (
        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold">ID waiting for verification</p>
            <p className="mt-1 text-foreground/70">
              {user.nin.status === "pending" ? (
                <>
                  NIN: <span className="font-mono">{user.nin.value}</span>
                </>
              ) : (
                <>
                  Driver&apos;s licence: <span className="font-mono">{user.driversLicence?.value}</span>
                </>
              )}{" "}
              — check it matches <span className="font-medium">{user.name}</span>, then mark them verified.
            </p>
          </div>
          <form action={adminVerifyUser}>
            <input type="hidden" name="userId" value={id} />
            <SubmitButton className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white">
              Mark verified
            </SubmitButton>
          </form>
        </section>
      )}

      {/* Controls */}
      <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-line p-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">Role</p>
          <UserRoleSelect userId={id} role={user.role} isSelf={isSelf} staffBase={user.staffBase} />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {!user.verifiedBadge && (
            <form action={adminVerifyUser}>
              <input type="hidden" name="userId" value={id} />
              <SubmitButton className="h-9 rounded-full border border-line px-4 text-sm font-medium">
                Mark identity verified (testing)
              </SubmitButton>
            </form>
          )}
          {user.role !== "admin" &&
            !isSelf &&
            (user.status === "banned" ? (
              <form action={unbanUser}>
                <input type="hidden" name="userId" value={id} />
                <SubmitButton className="h-9 rounded-full border border-line px-4 text-sm font-medium">
                  Unblock
                </SubmitButton>
              </form>
            ) : (
              <details>
                <summary className="flex h-9 cursor-pointer list-none items-center rounded-full border border-red-600/60 px-4 text-sm font-medium text-red-600">
                  Block account
                </summary>
                <form action={banUser} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="userId" value={id} />
                  <input
                    name="reason"
                    maxLength={300}
                    placeholder="Reason (internal)"
                    className="h-9 w-56 rounded-md border border-line bg-transparent px-2 text-sm"
                  />
                  <SubmitButton className="h-9 rounded-full bg-red-600 px-4 text-sm font-medium text-white">
                    Confirm block
                  </SubmitButton>
                </form>
              </details>
            ))}
        </div>
      </section>

      {/* At a glance */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Houses saved" value={savedListings.length} />
        <Stat label="Applications made" value={applications.length} />
        <Stat label="Meetings booked" value={meetingList.length + bookingCount} />
        <Stat label="Properties listed" value={ownListings.length} />
        <Stat label="Agreements" value={agreementList.length} />
        <Stat label="Paid through Reallow" value={naira(paidOut)} />
        <Stat label="Wallet balance" value={naira(user.walletBalanceNGN ?? 0)} />
        <Stat label="People referred" value={referredCount} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Notes */}
        <Section title="Admin notes" count={user.adminNotes?.length ?? 0}>
          <form action={addUserNote} className="flex flex-col gap-2">
            <input type="hidden" name="userId" value={id} />
            <textarea
              name="body"
              rows={2}
              maxLength={2000}
              required
              placeholder="Add a note or remark (only admins see this)"
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
            <SubmitButton className="h-8 self-start rounded-full bg-clay px-4 text-xs font-medium text-white">
              Add note
            </SubmitButton>
          </form>
          <ul className="mt-4 flex flex-col gap-3">
            {[...(user.adminNotes ?? [])].reverse().map((note, i) => (
              <li key={i} className="rounded-xl bg-foreground/5 p-3 text-sm">
                <p className="break-words whitespace-pre-line">{note.body}</p>
                <p className="mt-1 text-[11px] text-foreground/50">
                  {note.byName ?? "Admin"} · {formatLagos(note.at)}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Complaints */}
        <Section title="Reports & complaints" count={reportsFiled.length + reportsAgainstUser.length + reportsAgainstListings.length}>
          {reportsFiled.length + reportsAgainstUser.length + reportsAgainstListings.length === 0 ? (
            <Empty>No reports filed by or about this person.</Empty>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {reportsFiled.map((r) => (
                <li key={r._id!.toString()}>
                  <span className="text-xs text-foreground/50">Filed · {formatLagos(r.createdAt)} · {r.status}</span>
                  <br />
                  {r.reason}
                </li>
              ))}
              {[...reportsAgainstUser, ...reportsAgainstListings].map((r) => (
                <li key={r._id!.toString()} className="text-red-700 dark:text-red-400">
                  <span className="text-xs opacity-70">
                    Against {r.targetType === "listing" ? `“${titleOf(r.targetId)}”` : "them"} · {formatLagos(r.createdAt)} ·{" "}
                    {r.status}
                  </span>
                  <br />
                  {r.reason}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-foreground/50">
            {supportCount} message{supportCount === 1 ? "" : "s"} to Reallow support ·{" "}
            <Link href="/dashboard/admin/reports" className="underline">
              Reports queue
            </Link>
          </p>
        </Section>

        <Section title="Houses saved" count={savedListings.length}>
          {savedListings.length === 0 ? (
            <Empty>Nothing saved.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {savedListings.map((l) => (
                <li key={l._id!.toString()}>
                  <Link href={`/listings/${l._id}`} className="underline">
                    {l.title}
                  </Link>{" "}
                  <span className="text-xs text-foreground/50">({l.status.replace("_", " ")})</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Applications made" count={applications.length}>
          {applications.length === 0 ? (
            <Empty>No applications.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {applications.map((a) => {
                const decision = a.landlordDecision ?? (a.landlordPreferred ? "approved" : undefined);
                return (
                  <li key={a._id!.toString()}>
                    {titleOf(a.listingId)}{" "}
                    <span className="text-xs text-foreground/50">
                      · {formatLagos(a.createdAt)} · {decision === "approved" ? "accepted" : decision === "declined" ? "declined" : "pending"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Meetings & inspections" count={meetingList.length + bookingCount}>
          {meetingList.length === 0 && bookingCount === 0 ? (
            <Empty>No meetings booked.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {meetingList.map((m) => (
                <li key={m._id!.toString()}>
                  {m.kind === "inspection" ? "Inspection" : "Meeting"} · {titleOf(m.listingId)}{" "}
                  <span className="text-xs text-foreground/50">
                    · {formatLagos(m.scheduledFor ?? m.proposedTime)} · {m.status}
                    {m.kind === "inspection" && m.status === "confirmed" ? (m.paidAt ? " · paid" : " · unpaid") : ""} ·{" "}
                    {m.tenantId.equals(userId) ? "as applicant" : "as landlord"}
                  </span>
                </li>
              ))}
              {bookingCount > 0 && <li className="text-xs text-foreground/50">+ {bookingCount} older inspection booking(s)</li>}
            </ul>
          )}
        </Section>

        <Section title="Properties listed" count={ownListings.length}>
          {ownListings.length === 0 ? (
            <Empty>No listings.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {ownListings.map((l) => (
                <li key={l._id!.toString()}>
                  <Link href={`/listings/${l._id}`} className="underline">
                    {l.title}
                  </Link>{" "}
                  <span className="text-xs text-foreground/50">
                    · {l.status.replace("_", " ")} · {l.inquiriesCount ?? 0} application(s) · {l.savesCount ?? 0} save(s)
                  </span>
                </li>
              ))}
            </ul>
          )}
          {ownListings.length > 0 && (
            <Link href={`/dashboard/admin/listings`} className="mt-2 inline-block text-xs text-clay underline">
              Manage listings
            </Link>
          )}
        </Section>

        <Section title="Agreements" count={agreementList.length}>
          {agreementList.length === 0 ? (
            <Empty>No agreements.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {agreementList.map((a) => (
                <li key={a._id!.toString()}>
                  <Link href={`/agreements/${a._id}`} className="underline">
                    {titleOf(a.listingId)}
                  </Link>{" "}
                  <span className="text-xs text-foreground/50">
                    · {a.landlordId.equals(userId) ? "landlord" : "tenant"} · {a.status.replace(/_/g, " ")} · payment{" "}
                    {a.payment.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Payments" count={txns.length}>
          {txns.length === 0 ? (
            <Empty>No payments yet.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {txns.slice(0, 15).map((t) => (
                <li key={t._id!.toString()} className="flex justify-between gap-3">
                  <span>
                    {TRANSACTION_TYPE_LABEL[t.type] ?? t.type}
                    <span className="block text-[11px] text-foreground/50">
                      {formatLagos(t.createdAt)} · {t.provider}
                    </span>
                  </span>
                  <span className="font-mono">
                    {t.payerId.equals(userId) && t.type !== "wallet_funding" ? "−" : "+"}
                    {naira(t.amountNGN)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-foreground/50">
            Referral earnings credited: {naira(earned)} · {withdrawals.length} withdrawal request(s)
          </p>
        </Section>

        <Section title="Visit feedback given" count={feedbackGiven.length}>
          {feedbackGiven.length === 0 ? (
            <Empty>No ratings left.</Empty>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {feedbackGiven.slice(0, 10).map((f) => (
                <li key={f._id!.toString()}>
                  <span className="text-amber-500">{"★".repeat(f.rating)}</span>
                  <span className="text-foreground/20">{"★".repeat(5 - f.rating)}</span>{" "}
                  <span className="text-xs text-foreground/50">{formatLagos(f.createdAt)}</span>
                  {f.tags.length > 0 && <span className="block text-xs text-foreground/60">{f.tags.join(", ")}</span>}
                  {f.comment && <span className="block text-xs">{f.comment}</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {isStaffish && (
          <Section title="Visit reports filed" count={visitReports.length}>
            {visitReports.length === 0 ? (
              <Empty>No visit reports yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {visitReports.map((p) => (
                  <li key={p._id!.toString()}>
                    <Link href={`/listings/${p._id}`} className="underline">
                      {p.title}
                    </Link>{" "}
                    <span className="text-xs text-foreground/50">
                      · {formatLagos(p.verification.agentReport!.submittedAt)} · {p.verification.agentReport!.condition.replace(/_/g, " ")} ·{" "}
                      listing {p.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
