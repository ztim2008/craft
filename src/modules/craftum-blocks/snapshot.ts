import { randomUUID } from "crypto";

export type CraftumBlockNode = {
  id: string;
  tag: string;
  inner_html?: string;
  styles?: Record<string, unknown>;
  attrs?: Record<string, unknown>;
  children?: CraftumBlockNode[];
};

export type CraftumBlockSnapshot = {
  id?: string;
  priority?: string;
  title: string;
  content: CraftumBlockNode;
  slug_id?: number | Record<string, unknown>;
  slug?: Record<string, unknown>;
  page_id?: number;
  fonts?: unknown[];
  bind?: unknown;
};

/** Craftum ждёт массив объектов шрифтов; строки CSS (var(--sans-serif)) ломают рендер. */
export function sanitizeCraftumFonts(fonts: unknown): unknown[] {
  if (!Array.isArray(fonts)) return [];
  return fonts.filter((f) => f && typeof f === "object" && !Array.isArray(f));
}

export function sanitizeCraftumBlockSnapshot<T extends CraftumBlockSnapshot>(src: T): T {
  return {
    ...src,
    fonts: sanitizeCraftumFonts(src.fonts),
    page_id: undefined,
    id: undefined,
    priority: undefined,
  };
}

function remapNode(node: CraftumBlockNode, rootId: string): CraftumBlockNode {
  const newId = randomUUID();
  const attrs = { ...(node.attrs ?? {}) };
  const attrId = attrs.id;
  if (typeof attrId === "string" && attrId.startsWith("n-")) {
    attrs.id = `n-${newId}`;
  }
  if (attrs["data-root-id"]) attrs["data-root-id"] = rootId;

  return {
    ...node,
    id: newId,
    attrs,
    children: (node.children ?? []).map((ch) => remapNode(ch, rootId)),
  };
}

/** Клон блока Craftum для вставки на другую страницу (новые UUID). */
export function cloneCraftumBlockForPage(
  src: CraftumBlockSnapshot,
  pageId: number,
): Record<string, unknown> {
  const blockId = randomUUID();
  const content = remapNode(structuredClone(src.content), blockId);
  const rootAttrs = { ...(content.attrs ?? {}) };
  rootAttrs["data-root-id"] = blockId;
  rootAttrs.id = `n-${content.id}`;
  content.attrs = rootAttrs;

  const priority =
    src.priority && !src.priority.includes("i0000f")
      ? `1|${randomUUID().replace(/-/g, "").slice(0, 6)}:`
      : `1|${randomUUID().replace(/-/g, "").slice(0, 6)}:`;

  return {
    page_id: pageId,
    id: blockId,
    priority,
    title: src.title,
    slug_id: src.slug_id ?? null,
    slug: src.slug ?? null,
    content,
    fonts: sanitizeCraftumFonts(src.fonts),
    bind: src.bind ?? null,
  };
}

export function parseCraftumBlockSnapshot(raw: unknown): CraftumBlockSnapshot {
  if (!raw || typeof raw !== "object") throw new Error("craftumBlock обязателен");
  const o = raw as Record<string, unknown>;
  const title = String(o.title || "").trim();
  const content = o.content as CraftumBlockNode | undefined;
  if (!title) throw new Error("craftumBlock.title обязателен");
  if (!content || typeof content !== "object" || !content.id) {
    throw new Error("craftumBlock.content обязателен");
  }
  return raw as CraftumBlockSnapshot;
}
