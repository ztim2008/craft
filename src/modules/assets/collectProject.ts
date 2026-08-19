import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PageSnapshot } from "@/modules/crawler/types";
import { shouldDownloadAsset, isCssUrl, isSameOriginHtmlPage } from "./classify";
import {
  extractCssUrls,
  extractHtmlAssetCandidates,
  resolveAssetUrl,
} from "./collectUrls";
import { downloadAsset, mapPool } from "./download";
import { injectPreviewBase, previewAssetHref } from "./previewBase";
import {
  importedPagePathSet,
  pageOutputPath,
  relativeFromCss,
  rewriteUnimportedPageHrefs,
  rewriteUrls,
} from "./rewrite";
import { ASSET_LIMITS, type AssetCollectResult, type StoredAsset } from "./types";

function addCandidate(
  raw: string,
  pageUrl: string,
  pageHost: string,
  bucket: Set<string>,
) {
  const resolved = resolveAssetUrl(raw, pageUrl);
  if (!resolved) return;
  try {
    const url = new URL(resolved);
    if ((url.pathname === "/" || url.pathname === "") && !url.search) return;
    if (shouldDownloadAsset(url, pageHost)) bucket.add(url.toString());
  } catch {
    // ignore invalid
  }
}

export async function collectProjectAssets(input: {
  origin: string;
  pages: PageSnapshot[];
  projectRoot: string;
}): Promise<AssetCollectResult> {
  const pageHost = new URL(input.origin).host;
  const siteRoot = path.join(input.projectRoot, "site");
  const assetsDir = path.join(siteRoot, "assets");
  await mkdir(assetsDir, { recursive: true });

  const pending = new Set<string>();
  for (const page of input.pages) {
    const html = await readFile(page.htmlFile, "utf8");
    for (const raw of extractHtmlAssetCandidates(html)) {
      addCandidate(raw, page.finalUrl, pageHost, pending);
    }
    for (const entry of page.network) {
      if (!["stylesheet", "script", "image", "font", "media"].includes(entry.resourceType)) {
        continue;
      }
      addCandidate(entry.url, page.finalUrl, pageHost, pending);
    }
  }

  const byHash = new Map<string, StoredAsset>();
  const byUrl = new Map<string, StoredAsset>();
  const warnings: string[] = [];
  let totalBytes = 0;
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  async function downloadMissing(urls: string[]) {
    const fresh = urls.filter((url) => !byUrl.has(url)).slice(0, ASSET_LIMITS.maxAssets - byUrl.size);
    const results = await mapPool(fresh, ASSET_LIMITS.concurrency, async (url) => {
      if (totalBytes >= ASSET_LIMITS.maxTotalBytes) {
        skipped += 1;
        return null;
      }
      const asset = await downloadAsset(url, assetsDir, byHash);
      byUrl.set(url, asset);
      if (asset.status === "ok") {
        downloaded += 1;
        totalBytes += asset.size;
      } else if (asset.status === "skipped") {
        skipped += 1;
      } else {
        failed += 1;
        warnings.push(`${url}: ${asset.error || "fail"}`);
      }
      return asset;
    });
    return results.filter((item): item is StoredAsset => Boolean(item));
  }

  await downloadMissing([...pending]);

  for (let round = 0; round < ASSET_LIMITS.maxDiscoverRounds; round += 1) {
    const nested = new Set<string>();
    for (const asset of byUrl.values()) {
      if (asset.status !== "ok" || !isCssUrl(asset.originalUrl, asset.mimeType)) continue;
      const css = await readFile(path.join(siteRoot, asset.localPath), "utf8");
      for (const raw of extractCssUrls(css)) {
        addCandidate(raw, asset.originalUrl, pageHost, nested);
      }
    }
    const missing = [...nested].filter((url) => !byUrl.has(url));
    if (!missing.length) break;
    await downloadMissing(missing);
  }

  const replacementsAbs: Array<{ from: string; to: string }> = [];
  for (const [originalUrl, asset] of byUrl) {
    if (asset.status !== "ok") continue;
    replacementsAbs.push({ from: originalUrl, to: asset.localPath });
    try {
      const parsed = new URL(originalUrl);
      if (parsed.host === pageHost && !isSameOriginHtmlPage(parsed, pageHost)) {
        replacementsAbs.push({ from: parsed.pathname + parsed.search, to: asset.localPath });
      }
    } catch {
      // ignore
    }
  }

  for (const asset of byUrl.values()) {
    if (asset.status !== "ok" || !isCssUrl(asset.originalUrl, asset.mimeType)) continue;
    const abs = path.join(siteRoot, asset.localPath);
    const css = await readFile(abs, "utf8");
    const cssReplacements = replacementsAbs.map(({ from, to }) => ({
      from,
      to: relativeFromCss(asset.localPath, to),
    }));
    await writeFile(abs, rewriteUrls(css, cssReplacements), "utf8");
  }

  const jobId = path.basename(input.projectRoot);
  const previewOrigin = "https://craft.nordic-builder.ru";

  function normalizeUrl(raw: string): string {
    try {
      const url = new URL(raw);
      url.hash = "";
      if (url.pathname !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
      }
      return url.toString();
    } catch {
      return raw;
    }
  }

  function previewPathFor(pagePath: string): string {
    const outRel = pageOutputPath(pagePath);
    return `/preview/${jobId}/${outRel === "index.html" ? "" : outRel.replace(/index\.html$/, "")}`;
  }

  // Preview-only: переписываем ссылки на другие страницы на локальные `/preview/{jobId}/...`,
  // чтобы навигация по меню/карточкам работала внутри preview.
  const pageLinkReplacements: Array<{ from: string; to: string }> = [];
  const seenPageReplacements = new Set<string>();
  for (const page of input.pages) {
    const previewPath = previewPathFor(page.path);
    const abs1 = page.finalUrl;
    const abs2 = normalizeUrl(page.finalUrl);
    const rooted1 = page.path;
    const rootedTrim = rooted1 === "/" ? "/" : rooted1.replace(/\/+$/, "");
    const rootedSlash = rootedTrim === "/" ? "/" : `${rootedTrim}/`;

    const candidates: string[] = Array.from(new Set([abs1, abs2, rootedTrim, rootedSlash])).filter(
      (from) => from && from !== "/" && from.length > 1,
    );
    for (const from of candidates) {
      const key = `${from}=>${previewPath}`;
      if (seenPageReplacements.has(key)) continue;
      seenPageReplacements.add(key);
      pageLinkReplacements.push({ from, to: previewPath });
    }
  }
  const homePreview = previewPathFor("/");
  pageLinkReplacements.push(
    { from: `href="/"`, to: `href="${homePreview}"` },
    { from: `href='/'`, to: `href='${homePreview}'` },
  );

  for (const page of input.pages) {
    const html = await readFile(page.htmlFile, "utf8");
    const outRel = pageOutputPath(page.path);
    const assetReplacements = replacementsAbs.map(({ from, to }) => ({
      from,
      to: previewAssetHref(jobId, to),
    }));
    let rewritten = rewriteUrls(html, pageLinkReplacements);
    rewritten = rewriteUrls(rewritten, assetReplacements);
    rewritten = rewriteUnimportedPageHrefs(
      rewritten,
      input.origin,
      importedPagePathSet(input.pages.map((item) => item.path)),
    );
    rewritten = injectPreviewBase(rewritten, jobId);

    // SEO: canonical for preview.
    const canonicalUrl = `${previewOrigin}${previewPathFor(page.path)}`;
    if (!/<link[^>]+rel=(["'])canonical\\1/i.test(rewritten)) {
      if (/<\/head>/i.test(rewritten)) {
        rewritten = rewritten.replace(
          /<\/head>/i,
          `<link rel="canonical" href="${canonicalUrl}">\n</head>`,
        );
      } else if (/<head[^>]*>/i.test(rewritten)) {
        rewritten = rewritten.replace(
          /<head[^>]*>/i,
          (match) => `${match}\n<link rel="canonical" href="${canonicalUrl}">`,
        );
      }
    }
    const outAbs = path.join(siteRoot, outRel);
    await mkdir(path.dirname(outAbs), { recursive: true });
    await writeFile(outAbs, rewritten, "utf8");
    page.localHtmlFile = outAbs;
    page.previewPath = `/preview/${jobId}/${outRel === "index.html" ? "" : outRel.replace(/index\.html$/, "")}`;
  }

  // SEO: sitemap + robots for preview (and export потом можно параметризовать host).
  const sitemapLocs = input.pages.map((p) => `${previewOrigin}${previewPathFor(p.path)}`);
  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapLocs
      .map(
        (loc) =>
          `  <url>\n    <loc>${loc}</loc>\n  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  await writeFile(path.join(siteRoot, "sitemap.xml"), sitemapXml, "utf8");

  const robotsTxt =
    `User-agent: *\nAllow: /\nSitemap: ${previewOrigin}/preview/${jobId}/sitemap.xml\n`;
  await writeFile(path.join(siteRoot, "robots.txt"), robotsTxt, "utf8");

  return {
    assets: [...byUrl.values()],
    downloaded,
    failed,
    skipped,
    warnings: warnings.slice(0, 80),
  };
}
