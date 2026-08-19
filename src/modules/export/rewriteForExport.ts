import path from "node:path";

export function htmlPathToLoc(publicRoot: string, file: string): string {
  const rel = path.relative(publicRoot, file).replaceAll("\\", "/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  if (rel.endsWith(".html")) return `/${rel}`;
  return `/${rel}`;
}

export function sitemapXml(siteOrigin: string, locs: string[]): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  const urls = [...new Set(locs)]
    .sort()
    .map((loc) => `  <url><loc>${origin}${loc}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const PREVIEW_ABS_RE = /https?:\/\/[^/\s"'()]+\/preview\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//gi;
const PREVIEW_PATH_RE = /\/preview\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//gi;

export function hasPreviewPathLeak(text: string): boolean {
  PREVIEW_ABS_RE.lastIndex = 0;
  PREVIEW_PATH_RE.lastIndex = 0;
  return PREVIEW_ABS_RE.test(text) || PREVIEW_PATH_RE.test(text);
}

export function rewriteForExport(html: string, jobId: string, siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  const previewPrefix = `/preview/${jobId}/`;
  const previewAbs = `https://craft.nordic-builder.ru/preview/${jobId}/`;
  let next = html;
  next = next.replaceAll(previewAbs, `${origin}/`);
  next = next.replaceAll(previewPrefix, "/");
  next = next.replace(PREVIEW_ABS_RE, `${origin}/`);
  next = next.replace(PREVIEW_PATH_RE, "/");
  next = next.replace(/<base\s[^>]*>/i, `<base href="/">`);
  next = next.replace(
    /<link rel="canonical" href="[^"]*">/i,
    `<link rel="canonical" href="${origin}/">`,
  );
  return next;
}
