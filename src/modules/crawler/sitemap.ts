import { isSameOrigin } from "@/modules/security/urlGuard";

const LOC_RE = /<loc>\s*([^<>\s]+)\s*<\/loc>/gi;

function stripHash(url: URL): void {
  url.hash = "";
}

function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    stripHash(url);
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  for (const match of xml.matchAll(LOC_RE)) {
    const loc = match[1];
    if (loc) out.push(loc.trim());
  }
  return out;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function crawlSitemapRecursive(inputUrl: string, opts: {
  origin: string;
  depth: number;
  maxUrls: number;
  visited: Set<string>;
  out: Set<string>;
}): Promise<void> {
  if (opts.depth < 0) return;
  const normalized = normalizeUrl(inputUrl);
  if (opts.visited.has(normalized)) return;
  opts.visited.add(normalized);

  if (opts.out.size >= opts.maxUrls) return;

  const xml = await fetchText(normalized);
  if (!xml) return;

  const locs = extractLocs(xml);
  for (const loc of locs) {
    if (opts.out.size >= opts.maxUrls) break;
    if (!isSameOrigin(opts.origin, loc)) continue;
    const n = normalizeUrl(loc);
    // We include only URLs that look like pages (not obvious sitemap URLs).
    // If sitemapindex points to a sitemap, it will be processed via recursion too.
    if (n.toLowerCase().includes("sitemap")) {
      await crawlSitemapRecursive(n, {
        ...opts,
        depth: opts.depth - 1,
      });
      continue;
    }
    opts.out.add(n);
  }
}

export async function tryFetchSitemapUrls(origin: string, maxUrls: number): Promise<string[]> {
  const base = new URL(origin);
  const sitemapUrl = new URL("/sitemap.xml", base).toString();

  const out = new Set<string>();
  const visited = new Set<string>();

  await crawlSitemapRecursive(sitemapUrl, {
    origin,
    depth: 2,
    maxUrls: Math.max(1, maxUrls),
    visited,
    out,
  });

  return [...out].slice(0, maxUrls);
}

