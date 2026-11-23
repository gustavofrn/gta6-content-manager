import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

/** Pasta raiz onde as mídias enviadas são armazenadas localmente. */
export const MEDIA_DIR = path.join(process.cwd(), "media", "library");

const MIME_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/mp4": ".m4a",
  "audio/webm": ".weba",
};

const EXT_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".weba": "audio/webm",
};

export function extensionFor(mime: string, filename: string) {
  if (MIME_EXT[mime]) return MIME_EXT[mime];
  const ext = path.extname(filename).toLowerCase();
  return ext || "";
}

export function mediaTypeFor(mime: string): "video" | "image" | "audio" | "other" {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}

export function mimeForExt(ext: string) {
  return EXT_MIME[ext.toLowerCase()] || "application/octet-stream";
}

export async function saveMediaBuffer(filename: string, buffer: Buffer) {
  await mkdir(MEDIA_DIR, { recursive: true });
  const fullPath = path.join(MEDIA_DIR, filename);
  await writeFile(fullPath, buffer);
  return fullPath;
}

export async function readMediaFile(filename: string) {
  const safe = path.basename(filename);
  const fullPath = path.join(MEDIA_DIR, safe);
  return readFile(fullPath);
}
