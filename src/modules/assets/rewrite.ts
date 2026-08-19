import path from "node:path";
import { isSameOriginHtmlPage } from "./classify";

export function pageOutputPath(pagePath: string): string {
  const clean = pagePath === "/" ? "/" : pagePath.replace(/\/+$/, "");
  if (clean === "/") return "index.html";
  return `${clean.replace(/^\//, "")}/index.html`;
}

export function relativeFromPage(pagePath: string, assetPath: string): string {
  const htmlRel = pageOutputPath(pagePath);
  const fromDir = path.posix.dirname(`/${htmlRel}`);
  let rel = path.posix.relative(fromDir, `/${assetPath}`);
  if (!rel || rel === ".") return `./${path.posix.basename(assetPath)}`;
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/** Relative path from a CSS file to another asset in site/. */
export function relativeFromCss(cssLocalPath: string, assetLocalPath: string): string {
  const cssDir = path.posix.dirname(cssLocalPath);
  const assetDir = path.posix.dirname(assetLocalPath);
  if (cssDir === assetDir) {
    return `./${path.posix.basename(assetLocalPath)}`;
  }
  let rel = path.posix.relative(cssDir, assetLocalPath);
  if (!rel || rel === ".") return `./${path.posix.basename(assetLocalPath)}`;
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

export function rewriteUrls(
  source: string,
  replacements: Array<{ from: string; to: string }>,
): string {
  let next = source;
  const ordered = [...replacements].sort((a, b) => b.from.length - a.from.length);
  for (const { from, to } of ordered) {
    if (!from || from === to) continue;
    next = next.split(from).join(to);
  }
  return next;
}

/** Не подставлять голый путь `/privacy` в середину чужих URL (privacy-cs.mail.ru). */
export function pagePreviewLinkReplacements(
  pages: Array<{ path: string; finalUrl: string }>,
  previewPathFor: (pagePath: string) => string,
): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  const seen = new Set<string>();
  const add = (from: string, to: string) => {
    if (!from || from === to || from === "/" || from.length < 2) return;
    const key = `${from}=>${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ from, to });
  };
  for (const page of pages) {
    const previewPath = previewPathFor(page.path);
    add(page.finalUrl, previewPath);
    try {
      const url = new URL(page.finalUrl);
      url.hash = "";
      if (url.pathname !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
      }
      add(url.toString(), previewPath);
    } catch {
      // ignore
    }
    const trimmed = page.path === "/" ? "/" : page.path.replace(/\/+$/, "") || "/";
    if (trimmed === "/") continue;
    const slashed = `${trimmed}/`;
    for (const href of [trimmed, slashed]) {
      add(`href="${href}"`, `href="${previewPath}"`);
      add(`href='${href}'`, `href='${previewPath}'`);
      add(`action="${href}"`, `action="${previewPath}"`);
      add(`action='${href}'`, `action='${previewPath}'`);
    }
  }
  return out;
}

export function normalizePagePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

export function importedPagePathSet(paths: string[]): Set<string> {
  const set = new Set<string>();
  for (const raw of paths) {
    set.add(normalizePagePath(raw));
  }
  return set;
}

/** Ссылки на страницы, которых нет в импорте, оставляем на живом источнике (не 404 preview). */
export function rewriteUnimportedPageHrefs(
  html: string,
  sourceOrigin: string,
  importedPaths: Set<string>,
): string {
  let origin: URL;
  try {
    origin = new URL(sourceOrigin);
  } catch {
    return html;
  }
  const originRoot = origin.origin;
  return html.replace(/\b(href|action)\s*=\s*(["'])([^"']*)\2/gi, (full, attr, quote, raw) => {
    const value = String(raw).trim();
    if (!value || value.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(value)) {
      return full;
    }
    let url: URL;
    try {
      url = new URL(value, `${originRoot}/`);
    } catch {
      return full;
    }
    if (!isSameOriginHtmlPage(url, origin.hostname)) return full;
    const path = normalizePagePath(url.pathname);
    if (importedPaths.has(path)) return full;
    const abs = `${originRoot}${url.pathname}${url.search}${url.hash}`;
    return `${attr}=${quote}${abs}${quote}`;
  });
}
