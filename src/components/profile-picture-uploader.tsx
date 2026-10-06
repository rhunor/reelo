"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

// Camera only — deliberately no file picker, so a profile picture is always a live photo
// of the account holder rather than any image they have saved. Uses getUserMedia (needs
// HTTPS or localhost), uploads the captured frame to Cloudinary via a signed request,
// then saves it to the profile straight away.
export function ProfilePictureUploader({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("camera.unsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // The <video> mounts on this render — attach the stream on the next frame.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError(t("camera.denied"));
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    // Square, centre-cropped, mirrored back so it matches what the user saw.
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const context = canvas.getContext("2d")!;
    context.translate(600, 0);
    context.scale(-1, 1);
    context.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      600,
      600,
    );
    stopCamera();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setError(t("camera.captureFailed"));
      return;
    }
    await upload(blob);
  }

  async function upload(blob: Blob) {
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
        throw new Error(data?.error ?? t("camera.uploadFailed"));
      }
      const { cloudName, apiKey, timestamp, signature, folder } = await signatureRes.json();

      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error(t("camera.uploadFailed"));
      const { secure_url: url } = await uploadRes.json();

      const saveRes = await fetch("/api/profile/picture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!saveRes.ok) throw new Error(t("camera.saveFailed"));

      onChange(url);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-line bg-foreground/5">
        {cameraOn ? (
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL
          <img src={value} alt={t("profile.yourPicture")} className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full p-5 text-foreground/20">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
          </svg>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs">
            {t("common.saving")}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {cameraOn ? (
            <>
              <button
                type="button"
                onClick={capture}
                className="h-9 rounded-full bg-clay px-4 text-sm font-medium text-white"
              >
                {t("camera.take")}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="h-9 rounded-full border border-line px-4 text-sm font-medium"
              >
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              disabled={uploading}
              className="flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:border-clay hover:text-clay disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinejoin="round" d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              {t(value ? "camera.retake" : "camera.open")}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-foreground/50">
          {t("camera.hint")}
        </p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
