"use client";

import { useState } from "react";

export function VideoUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
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

        // Same signed folder/params as photo uploads — Cloudinary's /auto/upload endpoint
        // detects image vs video from the file itself, so no separate signing is needed.
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
        accept="video/*"
        multiple
        disabled={uploading}
        onChange={(event) => handleFiles(event.target.files)}
        className="text-sm"
      />
      {uploading && <p className="mt-1 text-xs text-foreground/50">Uploading…</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {value.map((url) => (
            <div key={url} className="relative">
              <video src={url} controls className="h-32 w-full rounded-md bg-black object-cover" />
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
