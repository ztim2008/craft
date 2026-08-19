import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertPublicHttpUrl } from "@/modules/security/urlGuard";
import { ASSET_LIMITS, type StoredAsset } from "./types";

const MIME_EXT: Record<string, string> = {
  "text/css": ".css",
  "text/javascript": ".js",
  "application/javascript": ".js",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "font/woff": ".woff",
  "font/woff2": ".woff2",
  "application/font-woff": ".woff",
  "application/font-woff2": ".woff2",
  "font/ttf": ".ttf",
  "font/otf": ".otf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
};

function extFromUrlOrMime(url: string, mime: string): string {
  const type = mime.split(";")[0].trim().toLowerCase();
  if (MIME_EXT[type]) return MIME_EXT[type];
  const pathname = new URL(url).pathname.toLowerCase();
  const match = pathname.match(/\.(css|js|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|mp4|webm|mp3)$/i);
  if (match) return match[0].replace("jpeg", "jpg");
  return ".bin";
}

export async function downloadAsset(
  originalUrl: string,
  assetsDir: string,
  byHash: Map<string, StoredAsset>,
): Promise<StoredAsset> {
  await assertPublicHttpUrl(originalUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSET_LIMITS.timeoutMs);
  try {
    const response = await fetch(originalUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        accept: "*/*",
      },
    });
    if (!response.ok) {
      return {
        originalUrl,
        localPath: "",
        hash: "",
        mimeType: "",
        extension: "",
        size: 0,
        status: "failed",
        error: `HTTP ${response.status}`,
      };
    }
    const mimeType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > ASSET_LIMITS.maxFileBytes) {
      return {
        originalUrl,
        localPath: "",
        hash: "",
        mimeType,
        extension: "",
        size: buffer.length,
        status: "failed",
        error: "Файл больше лимита",
      };
    }
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const existing = byHash.get(hash);
    if (existing) {
      return { ...existing, originalUrl, status: "ok" };
    }
    const extension = extFromUrlOrMime(originalUrl, mimeType);
    const filename = `${hash}${extension}`;
    await mkdir(assetsDir, { recursive: true });
    const abs = path.join(assetsDir, filename);
    await writeFile(abs, buffer);
    const stored: StoredAsset = {
      originalUrl,
      localPath: `assets/${filename}`,
      hash,
      mimeType,
      extension,
      size: buffer.length,
      status: "ok",
    };
    byHash.set(hash, stored);
    return stored;
  } catch (error) {
    return {
      originalUrl,
      localPath: "",
      hash: "",
      mimeType: "",
      extension: "",
      size: 0,
      status: "failed",
      error: error instanceof Error ? error.message : "download failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }
  const n = Math.min(limit, items.length) || 0;
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
