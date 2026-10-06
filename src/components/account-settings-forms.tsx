"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";

const inputClass = "w-full rounded-lg border border-line bg-transparent px-3 py-2";

function useJsonSubmit(endpoint: string) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(payload: unknown) {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Something went wrong");
      return null;
    }
    return data;
  }

  return { submit, error, message, setMessage, loading };
}

export function ContactSettingsForm({
  email,
  phone,
  alternatePhone,
  emailVerified,
}: {
  email: string;
  phone?: string;
  alternatePhone?: string;
  emailVerified?: boolean;
}) {
  const router = useRouter();
  const [emailValue, setEmailValue] = useState(email);
  const { submit, error, message, setMessage, loading } = useJsonSubmit("/api/account/contact");
  const emailChanging = emailValue.trim().toLowerCase() !== email;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = await submit({
      email: emailValue,
      phone: formData.get("phone"),
      alternatePhone: formData.get("alternatePhone") || undefined,
      currentPassword: formData.get("currentPassword") || undefined,
    });
    if (!data) return;
    if (data.emailChanged) {
      // The session still carries the old email — log in again with the new one.
      setMessage("Email updated. Check your new inbox to verify it — signing you out to log in again…");
      setTimeout(() => signOut({ redirectTo: "/login" }), 2500);
      return;
    }
    setMessage("Contact details saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm">Email</label>
        <input
          type="email"
          required
          value={emailValue}
          onChange={(event) => setEmailValue(event.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-foreground/50">
          {emailVerified ? "Verified." : "Not verified yet — check your inbox for the link."} Changing it
          means verifying the new address.
        </p>
      </div>
      {emailChanging && (
        <div>
          <label className="mb-1 block text-sm">Current password</label>
          <PasswordInput name="currentPassword" required className={inputClass + " pr-10"} />
          <p className="mt-1 text-xs text-foreground/50">Needed to change the email you log in with.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Phone number</label>
          <input name="phone" type="tel" required minLength={7} defaultValue={phone} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Alternative phone (optional)</label>
          <input name="alternatePhone" type="tel" defaultValue={alternatePhone} className={inputClass} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-foreground/50">
        Only Reallow staff see your numbers — never other users.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-verified">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-10 self-start rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save contact details"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const { submit, error, message, setMessage, loading } = useJsonSubmit("/api/account/password");
  const [newPassword, setNewPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = await submit({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!data) return;
    form.reset();
    setNewPassword("");
    setMessage("Password changed.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm">Current password</label>
        <PasswordInput name="currentPassword" required className={inputClass + " pr-10"} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">New password</label>
          <PasswordInput
            name="newPassword"
            required
            minLength={8}
            autoComplete="new-password"
            onValueChange={setNewPassword}
            className={inputClass + " pr-10"}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Confirm new password</label>
          <PasswordInput name="confirmPassword" required minLength={8} className={inputClass + " pr-10"} />
        </div>
      </div>
      <PasswordStrength password={newPassword} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-verified">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-10 self-start rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
