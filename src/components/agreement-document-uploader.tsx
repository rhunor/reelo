"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setListingAgreementDocument } from "@/app/dashboard/admin/actions";

// Admin → listings: upload the agreement document Reallow wants tenants/buyers to sign for
// this particular property (PDF recommended so it can be read in the page). Uses the same
// signed Cloudinary upload as listing photos.
export function AgreementDocumentUploader({
  listingId,
  current,
}: {
  listingId: string;
  current?: { url: string; name: string; uploadedAt: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const sigRes = await fetch("/api/uploads/cloudinary-signature", { method: "POST" });
      if (!sigRes.ok) throw new Error("Couldn't start the upload");
      const { cloudName, apiKey, timestamp, signature, folder } = await sigRes.json();
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);
      // PDFs and images go up as images (so PDFs can be shown in the page); Word files as raw.
      const resource = /\.(docx?|odt|rtf)$/i.test(file.name) ? "raw" : "auto";
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`, { method: "POST", body: form });
      if (!upRes.ok) throw new Error("Upload failed");
      const { secure_url: url } = await upRes.json();
      await setListingAgreementDocument(listingId, { url, name: file.name });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remove this agreement document? New payment requests will use Reallow's standard agreement.")) return;
    setBusy(true);
    await setListingAgreementDocument(listingId, null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-line p-3 text-xs">
      <p className="font-medium text-foreground/70">Agreement document</p>
      {current ? (
        <p className="mt-1 text-foreground/60">
          <a href={current.url} target="_blank" rel="noopener noreferrer" className="text-clay underline">
            {current.name}
          </a>{" "}
          · uploaded {current.uploadedAt} — shown to tenants/buyers instead of Reallow&apos;s standard agreement.
        </p>
      ) : (
        <p className="mt-1 text-foreground/50">None — payment requests use Reallow&apos;s standard agreement.</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className={`inline-flex h-8 cursor-pointer items-center rounded-full border border-line px-3 font-medium hover:border-clay hover:text-clay ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Uploading…" : current ? "Replace" : "Upload agreement"}
          <input
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        {current && (
          <button type="button" disabled={busy} onClick={remove} className="text-foreground/50 underline hover:text-red-600">
            Remove
          </button>
        )}
        <span className="text-foreground/40">PDF recommended.</span>
      </div>
      {error && <p className="mt-1 text-red-600">{error}</p>}
    </div>
  );
}
