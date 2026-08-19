import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PageSnapshot } from "@/modules/crawler/types";
import { shouldDownloadAsset, isCssUrl } from "./classify";
import {
  extractCssUrls,
  extractHtmlAssetCandidates,
  resolveAssetUrl,
} from "./collectUrls";
import { downloadAsset, mapPool } from "./download";
import { injectPreviewBase, previewAssetHref } from "./previewBase";
import { pageOutputPath, relativeFromCss, rewriteUrls } from "./rewrite";
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
      if (parsed.host === pageHost) {
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

  for (const page of input.pages) {
    const html = await readFile(page.htmlFile, "utf8");
    const outRel = pageOutputPath(page.path);
    const htmlReplacements = replacementsAbs.map(({ from, to }) => ({
      from,
      to: previewAssetHref(jobId, to),
    }));
    const rewritten = injectPreviewBase(
      rewriteUrls(html, htmlReplacements),
      jobId,
    );
    const outAbs = path.join(siteRoot, outRel);
    await mkdir(path.dirname(outAbs), { recursive: true });
    await writeFile(outAbs, rewritten, "utf8");
    page.localHtmlFile = outAbs;
    page.previewPath = `/preview/${jobId}/${outRel === "index.html" ? "" : outRel.replace(/index\.html$/, "")}`;
  }

  return {
    assets: [...byUrl.values()],
    downloaded,
    failed,
    skipped,
    warnings: warnings.slice(0, 80),
  };
}
