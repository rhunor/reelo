import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollections } from "@/lib/db";
import { CompleteProfileForm } from "@/components/complete-profile-form";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { users } = await getCollections();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Complete your profile</h1>
      <p className="mt-2 text-sm text-foreground/70">
        This helps Reallow get you a better match and confirms who to pay. We take your privacy
        seriously — see our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        . Nothing here shows to other users until you turn its visibility on, and your bank
        details never show to anyone but Reallow.
      </p>

      <CompleteProfileForm user={user ?? undefined} />
    </div>
  );
}
