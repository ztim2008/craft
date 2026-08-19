import { createHash } from "node:crypto";
import { elementRange } from "@/modules/dom/tagRange";
import { attr } from "@/modules/pageModel/html";
import { resolveLinkAction } from "./linkAction";
import { escapeHtml } from "./patchHtml";
import type { MenuInsert } from "./types";

const MENU_RE = /<!--craft-menu:[^>]+-->[\s\S]*?<!--\/craft-menu:[^>]+-->/g;
const OPEN_RE = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*\bdata-type=(["'])menu-item\3[^>]*)>/gi;
const CLUSTER_GAP = 2000;

type Item = { id: string; tag: string; start: number; end: number; html: string };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hashedNid(key: string): string {
  const h = createHash("sha1").update(key).digest("hex");
  return `n-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function findById(html: string, nodeId: string): { start: number; end: number } | null {
  const id = escapeRegex(nodeId);
  const openRe = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid=(["'])${id}\\2[^>]*>`, "i");
  const match = openRe.exec(html);
  if (!match) return null;
  return elementRange(html, match[1], match.index, match[0]);
}

function setAttr(openTag: string, name: string, value: string): string {
  const quoted = `${name}="${escapeHtml(value)}"`;
  const re = new RegExp(`(\\s${name}\\s*=\\s*)(["'])[\\s\\S]*?\\2`, "i");
  if (re.test(openTag)) return openTag.replace(re, `$1"${escapeHtml(value)}"`);
  return openTag.replace(/(\s*\/?>)$/, ` ${quoted}$1`);
}

function removeAttr(openTag: string, name: string): string {
  return openTag.replace(new RegExp(`\\s${name}(\\s*=\\s*(["'])[\\s\\S]*?\\2)?`, "i"), "");
}

export function stripMenuInserts(html: string): string {
  return html.replace(MENU_RE, "");
}

function collectItems(html: string): Item[] {
  const out: Item[] = [];
  const re = new RegExp(OPEN_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[1];
    const open = match[0];
    const range = elementRange(html, tag, match.index, open);
    if (!range) continue;
    const id = attr(match[2] || "", "id");
    if (!id) continue;
    out.push({ id, tag, start: range.start, end: range.end, html: html.slice(range.start, range.end) });
    re.lastIndex = range.end;
  }
  return out;
}

function cluster(items: Item[]): Item[][] {
  const groups: Item[][] = [];
  let current: Item[] = [];
  for (const item of items) {
    const prev = current[current.length - 1];
    if (prev && item.start - prev.end > CLUSTER_GAP) {
      groups.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length) groups.push(current);
  return groups;
}

function pickTemplate(items: Item[], groups: Item[][]): string | null {
  const all = groups.flat();
  const anchor = all.find((item) => item.tag.toLowerCase() === "a") || items.find((item) => item.tag.toLowerCase() === "a");
  return anchor ? anchor.html : null;
}

function rewriteIds(html: string, insert: MenuInsert, groupIndex: number): { html: string; itemId: string; textId: string } {
  const ids = [...html.matchAll(/\bid=(["'])(n-[^"']+)\1/gi)].map((m) => m[2]);
  const unique = [...new Set(ids)];
  const textTag = html.match(/<[^>]*\bdata-type=(["'])text\1[^>]*>/i);
  const textOrig = textTag ? textTag[0].match(/\bid=(["'])(n-[^"']+)\1/i)?.[2] || "" : "";
  const itemOrig = unique[0] || "";
  const extras = insert.extraNodeIds || [];
  let extraI = 0;
  const map = new Map<string, string>();
  const itemId = (insert.itemNodeIds && insert.itemNodeIds[groupIndex]) || hashedNid(`${insert.id}:item:${groupIndex}`);
  const textId = (insert.textNodeIds && insert.textNodeIds[groupIndex]) || hashedNid(`${insert.id}:text:${groupIndex}`);
  if (itemOrig) map.set(itemOrig, itemId);
  if (textOrig) map.set(textOrig, textId);
  for (const id of unique) {
    if (map.has(id)) continue;
    const next = extras[extraI++] || hashedNid(`${insert.id}:extra:${groupIndex}:${id}`);
    map.set(id, next);
  }
  let next = html.replace(/\bid=(["'])(n-[^"']+)\1/gi, (_full, q: string, id: string) => `id=${q}${map.get(id) || id}${q}`);
  return { html: next, itemId, textId };
}

function applyHref(html: string, insert: MenuInsert): string {
  const action = resolveLinkAction({
    value: insert.label,
    href: insert.href || "/",
    linkKind: insert.linkKind || "page",
    linkPage: insert.linkPage,
    linkSection: insert.linkSection,
    linkUrl: insert.linkUrl,
    linkBlank: insert.linkBlank,
    linkNofollow: insert.linkNofollow,
    linkDownload: insert.linkDownload,
  });
  if (!action.apply || !action.href) return html;
  const open = html.match(/^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/);
  if (!open) return html;
  let tag = open[1];
  let openTag = open[0];
  let close = "";
  const rest = html.slice(open[0].length);
  if (tag.toLowerCase() === "button") {
    openTag = openTag.replace(/^<button\b/i, "<a");
    tag = "a";
    close = rest.replace(/<\/button>\s*$/i, "</a>");
  } else {
    close = rest;
  }
  if (action.href) openTag = setAttr(openTag, "href", action.href);
  if (action.target) openTag = setAttr(openTag, "target", action.target);
  else openTag = removeAttr(openTag, "target");
  if (action.rel) openTag = setAttr(openTag, "rel", action.rel);
  else openTag = removeAttr(openTag, "rel");
  if (action.download) openTag = setAttr(openTag, "download", "");
  else openTag = removeAttr(openTag, "download");
  return `${openTag}${close}`;
}

function applyLabel(html: string, label: string): string {
  const re = /(<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bdata-type=(["'])text\3[^>]*>)([\s\S]*?)(<\/\2>)/i;
  return html.replace(re, (full, open: string, _tag: string, _q: string, inner: string, close: string) => {
    if (/<[a-z][\s\S]*?>/i.test(inner)) return full;
    return `${open}${escapeHtml(label)}${close}`;
  });
}

function copyRootId(html: string, fromHtml: string): string {
  const root = fromHtml.match(/\bdata-root-id=(["'])([^"']+)\1/i);
  if (!root) return html;
  const open = html.match(/^<[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/);
  if (!open) return html;
  return setAttr(open[0], "data-root-id", root[2]) + html.slice(open[0].length);
}

function wrap(insert: MenuInsert, groupIndex: number, inner: string): string {
  const safe = String(insert.id).replace(/[^a-zA-Z0-9_-]/g, "");
  return `<!--craft-menu:${safe}:${groupIndex}-->${inner}<!--/craft-menu:${safe}:${groupIndex}-->`;
}

function anchorIndex(groups: Item[][], afterNodeId: string | undefined, html: string): number | null {
  if (!afterNodeId) return null;
  const needle = findById(html, afterNodeId);
  for (const group of groups) {
    const direct = group.findIndex((item) => item.id === afterNodeId);
    if (direct >= 0) return direct;
    if (needle) {
      const inside = group.findIndex((item) => item.start <= needle.start && item.end >= needle.end);
      if (inside >= 0) return inside;
    }
  }
  return null;
}

export function applyMenuInserts(html: string, inserts: MenuInsert[] | undefined): string {
  const list = (inserts || []).filter((item) => item && item.id);
  let next = stripMenuInserts(html);
  if (!list.length) return next;
  const items = collectItems(next);
  if (!items.length) return next;
  const groups = cluster(items);
  const template = pickTemplate(items, groups);
  if (!template) return next;
  const byEnd = new Map<number, string[]>();
  groups.forEach((group, groupIndex) => {
    for (const insert of list) {
      const hint = anchorIndex(groups, insert.afterNodeId, next);
      const at = hint != null ? Math.min(Math.max(hint, 0), group.length - 1) : group.length - 1;
      const host = group[at];
      if (!host) continue;
      let cloned = rewriteIds(template, insert, groupIndex).html;
      cloned = copyRootId(cloned, host.html);
      cloned = applyLabel(cloned, String(insert.label || "Новая ссылка").trim() || "Новая ссылка");
      cloned = applyHref(cloned, insert);
      const bag = byEnd.get(host.end) || [];
      bag.push(wrap(insert, groupIndex, cloned));
      byEnd.set(host.end, bag);
    }
  });
  const slots = [...byEnd.entries()].sort((a, b) => b[0] - a[0]);
  for (const [end, chunks] of slots) {
    next = `${next.slice(0, end)}${chunks.join("")}${next.slice(end)}`;
  }
  return next;
}
