"use strict";

const TAGS = "div|p|h1|h2|h3|h4|h5|span|a|button|li|label";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setAttr(openTag, name, value) {
  const quoted = `${name}="${escapeHtml(value)}"`;
  const re = new RegExp(`(\\s${name}\\s*=\\s*)(["'])[\\s\\S]*?\\2`, "i");
  if (re.test(openTag)) return openTag.replace(re, `$1"${escapeHtml(value)}"`);
  return openTag.replace(/(\s*\/?>)$/, ` ${quoted}$1`);
}

function patchHtml(html, patches) {
  let next = html;
  for (const [nodeId, patch] of Object.entries(patches || {})) {
    if (!nodeId.startsWith("n-")) continue;
    const id = escapeRegex(nodeId);
    const openClose = new RegExp(
      `(<(${TAGS})\\b[^>]*\\bid=(["'])${id}\\3[^>]*>)([\\s\\S]*?)(</\\2>)`,
      "i",
    );
    const selfClose = new RegExp(`<(img)\\b([^>]*\\bid=(["'])${id}\\3[^>]*)(/?>)`, "i");
    if (patch.href != null && patch.href !== "") {
      next = next.replace(openClose, (_full, open, _tag, _q, inner, close) => {
        return `${setAttr(open, "href", patch.href || "")}${inner}${close}`;
      });
    }
    if (patch.value != null) {
      const img = next.match(selfClose);
      if (img) {
        next = next.replace(selfClose, (_full, tag, attrs, _q, end) => {
          return `<${tag}${setAttr(" " + attrs, "src", patch.value).replace(/^\s/, " ")}${end.startsWith("/") ? "/>" : ">"}`;
        });
      } else {
        next = next.replace(openClose, (_full, open, _tag, _q, inner, close) => {
          const hasChild = /<[a-z][\s\S]*?>/i.test(inner);
          if (hasChild) {
            const replaced = inner.replace(/>([^<]*)</, `>${escapeHtml(patch.value)}<`);
            if (replaced !== inner) return `${open}${replaced}${close}`;
          }
          return `${open}${escapeHtml(patch.value)}${close}`;
        });
      }
    }
  }
  return next;
}

function stripHtmlBlocks(html) {
  return html.replace(/<!--craft-block:[a-zA-Z0-9_-]+-->[\s\S]*?<!--\/craft-block:[a-zA-Z0-9_-]+-->/g, "");
}

function findElementRange(html, nodeId) {
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

function applyHtmlBlocks(html, blocks) {
  let next = stripHtmlBlocks(html);
  for (const block of blocks || []) {
    if (!block.sectionId || !String(block.html || "").trim()) continue;
    const range = findElementRange(next, block.sectionId);
    if (!range) continue;
    const wrapped = `<!--craft-block:${block.id}-->${block.html}<!--/craft-block:${block.id}-->`;
    next =
      block.position === "before"
        ? `${next.slice(0, range.start)}${wrapped}${next.slice(range.start)}`
        : `${next.slice(0, range.end)}${wrapped}${next.slice(range.end)}`;
  }
  return next;
}

function applyContent(html, overlay) {
  return applyHtmlBlocks(patchHtml(html, (overlay && overlay.fields) || {}), (overlay && overlay.htmlBlocks) || []);
}

module.exports = { applyContent, patchHtml, applyHtmlBlocks };
