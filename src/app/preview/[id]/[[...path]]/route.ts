import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { injectPreviewBase } from "@/modules/assets/previewBase";
import { getImportJob } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function safeFile(root: string, parts: string[]): string | null {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...parts);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    return null;
  }
  return resolved;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { id, path: segments = [] } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const job = await getImportJob(id);
  if (!job) return new Response("Not found", { status: 404 });

  const siteRoot = path.join(projectDir(id), "site");
  const cleaned = segments.filter((part) => part && part !== "." && part !== "..");
  let file = safeFile(siteRoot, cleaned.length ? cleaned : ["index.html"]);
  if (!file) return new Response("Not found", { status: 404 });

  try {
    const stat = await lstat(file);
    if (stat.isDirectory()) {
      file = path.join(file, "index.html");
    }
    const raw = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".html") {
      return new Response(new Uint8Array(raw), {
        headers: {
          "content-type": MIME[ext] || "application/octet-stream",
          "cache-control": "private, max-age=60",
        },
      });
    }
    const { getContent } = await import("@/modules/content/store");
    const { patchHtml } = await import("@/modules/content/patchHtml");
    const overlay = await getContent(id);
    let html = patchHtml(raw.toString("utf8"), overlay.fields);
    html = injectPreviewBase(html, id);
    const { injectFormBridge } = await import("@/modules/forms/formBridge");
    html = injectFormBridge(html, `/api/preview/${id}/form`);
    return new Response(html, {
      headers: {
        "content-type": MIME[ext],
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
