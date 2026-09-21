"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ProfilePictureUploader } from "@/components/profile-picture-uploader";
import type { User } from "@/types/models";

const inputClass = "rounded-lg border border-line px-3 py-2 bg-transparent";

function VisibilityToggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-foreground/60">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      Visible to others
    </label>
  );
}

export function CompleteProfileForm({ user }: { user?: Pick<User, "profile" | "bankDetails"> }) {
  const router = useRouter();
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profile?.profilePictureUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      occupation: formData.get("occupation") || undefined,
      maritalStatus: formData.get("maritalStatus") || undefined,
      religion: formData.get("religion") || undefined,
      employmentStatus: formData.get("employmentStatus") || undefined,
      gender: formData.get("gender") || undefined,
      stateOfOrigin: formData.get("stateOfOrigin") || undefined,
      presentAddress: formData.get("presentAddress") || undefined,
      profilePictureUrl: profilePictureUrl || undefined,
      occupationVisible: formData.get("occupationVisible") === "on",
      maritalStatusVisible: formData.get("maritalStatusVisible") === "on",
      religionVisible: formData.get("religionVisible") === "on",
      employmentStatusVisible: formData.get("employmentStatusVisible") === "on",
      genderVisible: formData.get("genderVisible") === "on",
      stateOfOriginVisible: formData.get("stateOfOriginVisible") === "on",
      profilePictureVisible: formData.get("profilePictureVisible") === "on",
      bankAccountName: formData.get("bankAccountName") || undefined,
      bankAccountNumber: formData.get("bankAccountNumber") || undefined,
      bankName: formData.get("bankName") || undefined,
    };

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not save profile");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium">Profile picture — take a selfie</p>
        <ProfilePictureUploader value={profilePictureUrl} onChange={setProfilePictureUrl} />
        <div className="mt-2">
          <VisibilityToggle name="profilePictureVisible" defaultChecked={user?.profile?.profilePictureVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Occupation</label>
        <input name="occupation" defaultValue={user?.profile?.occupation} className={inputClass + " w-full"} />
        <div className="mt-1">
          <VisibilityToggle name="occupationVisible" defaultChecked={user?.profile?.occupationVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Marital status</label>
        <select name="maritalStatus" defaultValue={user?.profile?.maritalStatus ?? ""} className={inputClass + " w-full"}>
          <option value="">Prefer not to say</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
        </select>
        <div className="mt-1">
          <VisibilityToggle name="maritalStatusVisible" defaultChecked={user?.profile?.maritalStatusVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Religion</label>
        <input name="religion" defaultValue={user?.profile?.religion} placeholder="Prefer not to say" className={inputClass + " w-full"} />
        <div className="mt-1">
          <VisibilityToggle name="religionVisible" defaultChecked={user?.profile?.religionVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Employment status</label>
        <select
          name="employmentStatus"
          defaultValue={user?.profile?.employmentStatus ?? ""}
          className={inputClass + " w-full"}
        >
          <option value="">Prefer not to say</option>
          <option value="student">Student</option>
          <option value="self_employed">Self-employed</option>
          <option value="employed">Employed</option>
        </select>
        <div className="mt-1">
          <VisibilityToggle name="employmentStatusVisible" defaultChecked={user?.profile?.employmentStatusVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Gender</label>
        <select name="gender" defaultValue={user?.profile?.gender ?? ""} className={inputClass + " w-full"}>
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
        <div className="mt-1">
          <VisibilityToggle name="genderVisible" defaultChecked={user?.profile?.genderVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">State of origin</label>
        <input
          name="stateOfOrigin"
          defaultValue={user?.profile?.stateOfOrigin}
          className={inputClass + " w-full"}
        />
        <div className="mt-1">
          <VisibilityToggle name="stateOfOriginVisible" defaultChecked={user?.profile?.stateOfOriginVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Present address</label>
        <input
          name="presentAddress"
          defaultValue={user?.profile?.presentAddress}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">Never shown to other users.</p>
      </div>

      <div className="rounded-lg border border-line p-4">
        <p className="text-sm font-medium">Bank details</p>
        <p className="mt-1 text-xs text-foreground/50">
          Never shown to other users — used only to verify your identity for payouts. The name on
          your bank account must match your NIN and BVN.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <input
            name="bankAccountName"
            placeholder="Account name"
            defaultValue={user?.bankDetails?.accountName}
            className={inputClass}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="bankAccountNumber"
              placeholder="Account number"
              defaultValue={user?.bankDetails?.accountNumber}
              className={inputClass}
            />
            <input
              name="bankName"
              placeholder="Bank name"
              defaultValue={user?.bankDetails?.bankName}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-verified">Saved.</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 self-start rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
