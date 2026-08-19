import type { HtmlBlock } from "./types";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripHtmlBlocks(html: string): string {
  return html.replace(/<!--craft-block:[a-zA-Z0-9_-]+-->[\s\S]*?<!--\/craft-block:[a-zA-Z0-9_-]+-->/g, "");
}

function findElementRange(html: string, nodeId: string): { start: number; end: number } | null {
  const id = escapeRegex(nodeId);
  const openRe = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid=(["'])${id}\\2[^>]*>`, "i");
  const match = openRe.exec(html);
  if (!match) return null;
  const tag = match[1];
  const start = match.index;
  const afterOpen = start + match[0].length;
  if (/\/>$/.test(match[0])) return { start, end: afterOpen };

  let depth = 1;
  let cursor = afterOpen;
  const lower = html.toLowerCase();
  const tagLower = tag.toLowerCase();
  while (cursor < html.length && depth > 0) {
    const from = lower.slice(cursor);
    const openAt = from.search(new RegExp(`<${tagLower}\\b`, "i"));
    const closeAt = from.search(new RegExp(`</${tagLower}\\s*>`, "i"));
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

function wrapBlock(block: HtmlBlock): string {
  return `<!--craft-block:${block.id}-->${block.html}<!--/craft-block:${block.id}-->`;
}

function insertSlot(html: string, position: HtmlBlock["position"], chunk: string): string {
  if (position === "head") {
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${chunk}\n</head>`);
    return chunk + html;
  }
  if (position === "bodyStart") {
    if (/<body\b[^>]*>/i.test(html)) return html.replace(/<body\b[^>]*>/i, (m) => `${m}\n${chunk}`);
    return chunk + html;
  }
  if (position === "bodyEnd") {
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${chunk}\n</body>`);
    return html + chunk;
  }
  return html;
}

export function applyHtmlBlocks(html: string, blocks: HtmlBlock[]): string {
  let next = stripHtmlBlocks(html);
  for (const block of blocks) {
    if (!String(block.html || "").trim()) continue;
    const wrapped = wrapBlock(block);
    if (block.position === "head" || block.position === "bodyStart" || block.position === "bodyEnd") {
      next = insertSlot(next, block.position, wrapped);
      continue;
    }
    if (!block.sectionId) continue;
    const range = findElementRange(next, block.sectionId);
    if (!range) continue;
    if (block.position === "before") {
      next = `${next.slice(0, range.start)}${wrapped}${next.slice(range.start)}`;
    } else {
      next = `${next.slice(0, range.end)}${wrapped}${next.slice(range.end)}`;
    }
  }
  return next;
}
