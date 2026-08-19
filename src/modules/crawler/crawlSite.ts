import path from "node:path";
import type { Browser } from "playwright";
import { isSameOrigin } from "@/modules/security/urlGuard";
import { crawlPage } from "./crawlPage";
import type { ImportJob, PageSnapshot } from "./types";
import { CRAWL_LIMITS } from "./types";

function normalizeQueueUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export async function crawlSite(
  browser: Browser,
  job: ImportJob,
  projectRoot: string,
  onProgress: (patch: Partial<ImportJob>) => Promise<void>,
): Promise<Pick<ImportJob, "pages" | "discoveredLinks" | "pagesFound" | "pagesProcessed" | "assetsFound" | "networkHits" | "warnings">> {
  const started = Date.now();
  const origin = new URL(job.sourceUrl).origin;
  const queued: string[] = [normalizeQueueUrl(job.sourceUrl)];
  const visited = new Set<string>();
  const ignored = new Set<string>();
  const pages: PageSnapshot[] = [];
  const discovered = new Set<string>();
  const warnings: string[] = [];
  const maxPages = job.homepageOnly ? 1 : Math.min(job.maxPages, CRAWL_LIMITS.maxPages);

  while (queued.length > 0 && pages.length < maxPages) {
    if (Date.now() - started > CRAWL_LIMITS.maxTotalTimeMs) {
      warnings.push("Достигнут лимит времени обхода");
      break;
    }

    const next = queued.shift();
    if (!next || visited.has(next)) continue;
    if (!isSameOrigin(origin, next)) {
      ignored.add(next);
      continue;
    }
    visited.add(next);

    const pageDir = path.join(projectRoot, "pages", String(pages.length));
    try {
      const { snapshot } = await crawlPage(browser, next, pageDir);
      pages.push(snapshot);
      for (const link of snapshot.links) {
        discovered.add(link.url);
        if (
          link.kind === "same-origin" &&
          !visited.has(normalizeQueueUrl(link.url)) &&
          !queued.includes(normalizeQueueUrl(link.url)) &&
          pages.length + queued.length < maxPages
        ) {
          queued.push(normalizeQueueUrl(link.url));
        }
      }
      await onProgress({
        status: "crawling",
        pagesFound: discovered.size,
        pagesProcessed: pages.length,
        networkHits: pages.reduce((sum, page) => sum + page.network.length, 0),
        assetsFound: pages.reduce((sum, page) => sum + page.network.length, 0),
        discoveredLinks: [...discovered].slice(0, 500),
        pages,
        warnings,
      });
    } catch (error) {
      warnings.push(
        `${next}: ${error instanceof Error ? error.message : "ошибка crawl"}`,
      );
    }
  }

  return {
    pages,
    discoveredLinks: [...discovered],
    pagesFound: discovered.size,
    pagesProcessed: pages.length,
    networkHits: pages.reduce((sum, page) => sum + page.network.length, 0),
    assetsFound: pages.reduce((sum, page) => sum + page.network.length, 0),
    warnings,
  };
}
