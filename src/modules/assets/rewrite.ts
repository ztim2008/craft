import path from "node:path";

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
