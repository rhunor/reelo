import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { TenantProfileForm } from "@/components/tenant-profile-form";

export const dynamic = "force-dynamic";

export default async function TenantProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Everything here is optional. Sharing it can strengthen your case with a landlord — but
        nothing is shown to anyone unless you turn on sharing below.
      </p>
      <TenantProfileForm profile={user?.tenantProfile} />
    </div>
  );
}
