"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ProfilePictureUploader } from "@/components/profile-picture-uploader";
import type { User } from "@/types/models";
import { useI18n } from "@/components/i18n-provider";

const inputClass = "rounded-lg border border-line px-3 py-2 bg-transparent";

function VisibilityToggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked?: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className="flex items-center gap-1.5 text-xs text-foreground/60">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {t("profile.visible")}
    </label>
  );
}

export function CompleteProfileForm({ user }: { user?: Pick<User, "profile" | "bankDetails"> }) {
  const router = useRouter();
  const { t } = useI18n();
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
      dateOfBirth: formData.get("dateOfBirth") || undefined,
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
      setError(data?.error ?? t("profile.saveFailed"));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium">{t("profile.picture")}</p>
        <ProfilePictureUploader value={profilePictureUrl} onChange={setProfilePictureUrl} />
        <div className="mt-2">
          <VisibilityToggle name="profilePictureVisible" defaultChecked={user?.profile?.profilePictureVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">{t("profile.dob")}</label>
        <input
          name="dateOfBirth"
          type="date"
          defaultValue={user?.profile?.dateOfBirth}
          max={new Date().toISOString().slice(0, 10)}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">{t("profile.neverShown")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm">{t("profile.gender")}</label>
        <select name="gender" defaultValue={user?.profile?.gender ?? ""} className={inputClass + " w-full"}>
          <option value="">{t("profile.preferNot")}</option>
          <option value="female">{t("profile.female")}</option>
          <option value="male">{t("profile.male")}</option>
        </select>
        <div className="mt-1">
          <VisibilityToggle name="genderVisible" defaultChecked={user?.profile?.genderVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">{t("profile.stateOfOrigin")}</label>
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
        <label className="mb-1 block text-sm">{t("profile.presentAddress")}</label>
        <input
          name="presentAddress"
          defaultValue={user?.profile?.presentAddress}
          className={inputClass + " w-full"}
        />
        <p className="mt-1 text-xs text-foreground/50">{t("profile.neverShown")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm">{t("profile.maritalStatus")}</label>
        <select name="maritalStatus" defaultValue={user?.profile?.maritalStatus ?? ""} className={inputClass + " w-full"}>
          <option value="">{t("profile.preferNot")}</option>
          <option value="single">{t("profile.single")}</option>
          <option value="married">{t("profile.married")}</option>
          <option value="divorced">{t("profile.divorced")}</option>
          <option value="widowed">{t("profile.widowed")}</option>
        </select>
        <div className="mt-1">
          <VisibilityToggle name="maritalStatusVisible" defaultChecked={user?.profile?.maritalStatusVisible} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">{t("profile.religion")}</label>
        <input name="religion" defaultValue={user?.profile?.religion} placeholder={t("profile.preferNot")} className={inputClass + " w-full"} />
        <div className="mt-1">
          <VisibilityToggle name="religionVisible" defaultChecked={user?.profile?.religionVisible} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">{t("profile.employmentStatus")}</label>
          <select
            name="employmentStatus"
            defaultValue={user?.profile?.employmentStatus ?? ""}
            className={inputClass + " w-full"}
          >
            <option value="">{t("profile.preferNot")}</option>
            <option value="student">{t("profile.student")}</option>
            <option value="self_employed">{t("profile.selfEmployed")}</option>
            <option value="employed">{t("profile.employed")}</option>
          </select>
          <div className="mt-1">
            <VisibilityToggle name="employmentStatusVisible" defaultChecked={user?.profile?.employmentStatusVisible} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm">{t("profile.occupation")}</label>
          <input name="occupation" defaultValue={user?.profile?.occupation} className={inputClass + " w-full"} />
          <div className="mt-1">
            <VisibilityToggle name="occupationVisible" defaultChecked={user?.profile?.occupationVisible} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line p-4">
        <p className="text-sm font-medium">{t("profile.bankDetails")}</p>
        <p className="mt-1 text-xs text-foreground/50">
          {t("profile.bankHint")}
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <input
            name="bankAccountName"
            placeholder={t("profile.accountName")}
            defaultValue={user?.bankDetails?.accountName}
            className={inputClass}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="bankAccountNumber"
              placeholder={t("profile.accountNumber")}
              defaultValue={user?.bankDetails?.accountNumber}
              className={inputClass}
            />
            <input
              name="bankName"
              placeholder={t("profile.bankName")}
              defaultValue={user?.bankDetails?.bankName}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-verified">{t("common.saved")}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 self-start rounded-full bg-clay px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? t("common.saving") : t("profile.save")}
      </button>
    </form>
  );
}
