"use client";

import { useState } from "react";

export function PhotoUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const signatureRes = await fetch("/api/uploads/cloudinary-signature", { method: "POST" });
      if (!signatureRes.ok) {
        const data = await signatureRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not start upload");
      }
      const { cloudName, apiKey, timestamp, signature, folder } = await signatureRes.json();

      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
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

        if (!uploadRes.ok) {
          throw new Error("Upload failed");
        }

        const uploadData = await uploadRes.json();
        uploadedUrls.push(uploadData.secure_url);
      }

      onChange([...value, ...uploadedUrls]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(event) => handleFiles(event.target.files)}
        className="text-sm"
      />
      {uploading && <p className="mt-1 text-xs text-foreground/50">Uploading…</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {value.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URLs, not worth configuring next/image remote patterns for a small preview thumbnail */}
              <img src={url} alt="" className="h-20 w-full rounded-md object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((existing) => existing !== url))}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
