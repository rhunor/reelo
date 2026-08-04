import { v2 as cloudinary } from "cloudinary";

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET");
  }

  return { cloudName, apiKey, apiSecret };
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export function createUploadSignature(folder: string): UploadSignature {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);

  return { cloudName, apiKey, timestamp, signature, folder };
}
