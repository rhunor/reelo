"use client";

import { useState } from "react";

export function ProfilePictureUploader({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const signatureRes = await fetch("/api/uploads/cloudinary-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "profile" }),
      });
      if (!signatureRes.ok) {
        const data = await signatureRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not start upload");
      }
      const { cloudName, apiKey, timestamp, signature, folder } = await signatureRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const uploadData = await uploadRes.json();
      onChange(uploadData.secure_url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not worth configuring next/image remote patterns for a small avatar preview
        <img src={value} alt="" className="h-16 w-16 rounded-full object-cover" />
      )}
      <div>
        <input
          type="file"
          accept="image/*"
          capture="user"
          disabled={uploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
          className="text-sm"
        />
        <p className="mt-1 text-xs text-foreground/50">
          Opens your front camera on mobile. On desktop this still shows a normal file picker.
        </p>
        {uploading && <p className="mt-1 text-xs text-foreground/50">Uploading…</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
