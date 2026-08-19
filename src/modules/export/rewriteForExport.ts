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

export function rewriteForExport(html: string, jobId: string, siteOrigin: string): string {
  const previewPrefix = `/preview/${jobId}/`;
  const previewAbs = `https://craft.nordic-builder.ru/preview/${jobId}/`;
  let next = html;
  next = next.replaceAll(previewAbs, `${siteOrigin.replace(/\/+$/, "")}/`);
  next = next.replaceAll(previewPrefix, "/");
  next = next.replace(/<base\s[^>]*>/i, `<base href="/">`);
  next = next.replace(
    /<link rel="canonical" href="[^"]*">/i,
    `<link rel="canonical" href="${siteOrigin.replace(/\/+$/, "")}/">`,
  );
  return next;
}
