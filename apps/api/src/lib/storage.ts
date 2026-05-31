import { randomUUID } from "node:crypto";
import { env } from "../env.js";
import { supabaseAdmin } from "./supabase.js";

/**
 * Supabase Storage. The backend uses the service-role key to mint a short-lived
 * signed upload URL; the browser uploads the file directly to Supabase (the API
 * server never proxies the bytes). Media is served from the bucket's public URL,
 * which is fronted by Supabase's CDN.
 */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB (also enforce a bucket-level limit)

export async function presignUpload(input: {
  shopId: string;
  contentType: string;
  size: number;
}): Promise<{
  uploadUrl: string;
  token: string;
  publicUrl: string;
  path: string;
}> {
  const ext = ALLOWED[input.contentType];
  if (!ext) throw new Error("Unsupported content type");
  if (input.size <= 0 || input.size > MAX_BYTES) throw new Error("File too large");

  const path = `shops/${input.shopId}/${randomUUID()}.${ext}`;
  const bucket = supabaseAdmin.storage.from(env.SUPABASE_STORAGE_BUCKET);

  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Could not sign upload");

  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  return { uploadUrl: data.signedUrl, token: data.token, publicUrl, path };
}
