export function elementRange(
  html: string,
  tag: string,
  openStart: number,
  openTag: string,
): { start: number; end: number } | null {
  const start = openStart;
  const afterOpen = openStart + openTag.length;
  if (/\/>$/.test(openTag.trim()) || /^<img\b/i.test(openTag) || /^<input\b/i.test(openTag)) {
    return { start, end: afterOpen };
  }
  let depth = 1;
  let cursor = afterOpen;
  const lower = html.toLowerCase();
  const tagLower = tag.toLowerCase();
  const openPat = new RegExp(`<${tagLower}\\b`, "i");
  const closePat = new RegExp(`</${tagLower}\\s*>`, "i");
  while (cursor < html.length && depth > 0) {
    const from = lower.slice(cursor);
    const openAt = from.search(openPat);
    const closeAt = from.search(closePat);
    if (closeAt < 0) return null;
    if (openAt >= 0 && openAt < closeAt) {
      const abs = cursor + openAt;
      const opened = html.slice(abs).match(new RegExp(`^<${tag}\\b[^>]*>`, "i"));
      cursor = abs + (opened ? opened[0].length : tag.length + 1);
      depth += 1;
    } else {
      const abs = cursor + closeAt;
      const closed = html.slice(abs).match(new RegExp(`^</${tag}\\s*>`, "i"));
      cursor = abs + (closed ? closed[0].length : tag.length + 3);
      depth -= 1;
      if (depth === 0) return { start, end: cursor };
    }
  }
  return null;
}
