const PROXY_RE =
  /https:\/\/static\.craftum\.com\/[^\s"'<>\\]+\/filters:no_upscale\(\)\/https?:\/\/[^\s"'<>\\)]+/gi;
const HTTP_RE = /https?:\/\/[^\s"'<>\\)]+/gi;
const URL_FN_RE = /url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi;
const IMPORT_RE = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/gi;

function stripTrailingJunk(raw: string): string {
  return raw.trim().replace(/[),;]+$/g, "").replace(/^['"]|['"]$/g, "");
}

export function extractCraftumProxyUrls(text: string): string[] {
  return [...text.matchAll(PROXY_RE)].map((match) => stripTrailingJunk(match[0]));
}

export function extractHttpUrls(text: string): string[] {
  const proxies = extractCraftumProxyUrls(text);
  const used = new Set(proxies);
  const extra: string[] = [];
  for (const match of text.matchAll(HTTP_RE)) {
    const url = stripTrailingJunk(match[0]);
    if ([...used].some((proxy) => proxy.includes(url) || url.startsWith(proxy))) {
      continue;
    }
    if (proxies.some((proxy) => proxy.startsWith(url) && proxy.length > url.length)) {
      continue;
    }
    extra.push(url);
  }
  return [...proxies, ...extra];
}

export function extractCssUrls(css: string): string[] {
  const found: string[] = [...extractCraftumProxyUrls(css)];
  for (const match of css.matchAll(URL_FN_RE)) {
    const inner = stripTrailingJunk(match[2] || "");
    if (!inner || inner.startsWith("data:")) continue;
    if (/filters:no_upscale\(/.test(inner) && !inner.includes(")/https")) {
      continue;
    }
    found.push(inner);
  }
  for (const match of css.matchAll(IMPORT_RE)) {
    found.push(stripTrailingJunk(match[1] || ""));
  }
  return found;
}

export function extractHtmlAssetCandidates(html: string): string[] {
  const found: string[] = [];
  const attr = /(?:src|href|poster|data-src)=['"]([^'"]+)['"]/gi;
  for (const match of html.matchAll(attr)) {
    found.push(match[1]);
  }
  const srcset = /srcset=['"]([^'"]+)['"]/gi;
  for (const match of html.matchAll(srcset)) {
    for (const part of match[1].split(/,(?=\s*(?:https?:|\/))/)) {
      const url = part.trim().split(/\s+/)[0];
      if (url) found.push(url);
    }
  }
  const style = /style=['"]([^'"]+)['"]/gi;
  for (const match of html.matchAll(style)) {
    found.push(...extractCssUrls(match[1]));
    found.push(...extractHttpUrls(match[1]));
  }
  found.push(...extractCraftumProxyUrls(html));
  return found;
}

export function resolveAssetUrl(raw: string, pageUrl: string): string | null {
  const trimmed = stripTrailingJunk(raw);
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
    return null;
  }
  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}
