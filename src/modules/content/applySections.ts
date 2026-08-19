import { attr } from "@/modules/pageModel/html";
import { elementRange } from "@/modules/dom/tagRange";
import type { SectionInsert, SectionLayout } from "./types";

const INSERT_RE = /<!--craft-section:[a-zA-Z0-9_-]+-->[\s\S]*?<!--\/craft-section:[a-zA-Z0-9_-]+-->/g;

type Piece = { id: string; html: string; gapAfter: string };

function findCliSections(html: string): { id: string; start: number; end: number }[] {
  const out: { id: string; start: number; end: number }[] = [];
  const re = /<section\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const attrs = match[1] || "";
    if (!/\bcli-block\b/.test(attr(attrs, "class"))) continue;
    const id = attr(attrs, "id");
    if (!id) continue;
    const range = elementRange(html, "section", match.index, match[0]);
    if (!range) continue;
    out.push({ id, start: range.start, end: range.end });
    re.lastIndex = range.end;
  }
  return out;
}

function markHidden(sectionHtml: string, hide: boolean): string {
  let next = sectionHtml.replace(/\sdata-craft-hidden="true"/i, "").replace(/\shidden(?=[\s>])/i, "");
  if (!hide) return next;
  return next.replace(/<section\b/i, `<section hidden data-craft-hidden="true"`);
}

function wrapInsert(block: SectionInsert): string {
  return `<!--craft-section:${block.id}-->${block.html}<!--/craft-section:${block.id}-->`;
}

function insertSlotKey(item: SectionInsert): string {
  return item.afterId || "";
}

export function moveSectionInsert(
  inserts: SectionInsert[],
  id: string,
  dir: "up" | "down",
  sectionOrder: string[],
): SectionInsert[] {
  const next = inserts.slice();
  const item = next.find((block) => block.id === id);
  if (!item) return next;
  const key = insertSlotKey(item);
  const slot = next.filter((block) => insertSlotKey(block) === key);
  const slotIndex = slot.findIndex((block) => block.id === id);
  const swapWith =
    dir === "up" && slotIndex > 0
      ? slot[slotIndex - 1]
      : dir === "down" && slotIndex < slot.length - 1
        ? slot[slotIndex + 1]
        : null;
  if (swapWith) {
    const i = next.findIndex((block) => block.id === item.id);
    const j = next.findIndex((block) => block.id === swapWith.id);
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    return next;
  }
  const slots = [""].concat(sectionOrder.filter(Boolean));
  const cur = slots.indexOf(key);
  if (dir === "up") {
    if (cur <= 0) return next;
    item.afterId = slots[cur - 1] || undefined;
  } else if (cur < 0 || cur >= slots.length - 1) {
    return next;
  } else {
    item.afterId = slots[cur + 1] || undefined;
  }
  const from = next.findIndex((block) => block.id === id);
  next.splice(from, 1);
  const newKey = insertSlotKey(item);
  if (dir === "up") {
    let insertAt = 0;
    for (let i = 0; i < next.length; i++) {
      if (insertSlotKey(next[i]) === newKey) insertAt = i + 1;
    }
    next.splice(insertAt, 0, item);
  } else {
    const first = next.findIndex((block) => insertSlotKey(block) === newKey);
    next.splice(first < 0 ? next.length : first, 0, item);
  }
  return next;
}

export function applySections(html: string, layout?: SectionLayout): string {
  let next = html.replace(INSERT_RE, "");
  const found = findCliSections(next);
  if (!found.length) return next;
  const removed = new Set(layout?.removed || []);
  const hidden = new Set(layout?.hidden || []);
  const pieces: Piece[] = found.map((item, index) => ({
    id: item.id,
    html: markHidden(next.slice(item.start, item.end), hidden.has(item.id)),
    gapAfter: next.slice(item.end, found[index + 1] ? found[index + 1].start : item.end),
  }));
  const prefix = next.slice(0, found[0].start);
  const suffix = next.slice(found[found.length - 1].end);
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const order = (layout?.order || []).filter((id) => byId.has(id) && !removed.has(id));
  for (const piece of pieces) {
    if (!removed.has(piece.id) && !order.includes(piece.id)) order.push(piece.id);
  }
  const inserts = layout?.inserts || [];
  const chunks: string[] = [];
  for (const id of order) {
    const piece = byId.get(id);
    if (!piece) continue;
    chunks.push(piece.html + piece.gapAfter);
    for (const extra of inserts.filter((item) => item.afterId === id && item.html.trim())) {
      chunks.push(wrapInsert(extra));
    }
  }
  const leading = inserts.filter((item) => !item.afterId && item.html.trim());
  if (leading.length) chunks.unshift(...leading.map(wrapInsert));
  return prefix + chunks.join("") + suffix;
}
