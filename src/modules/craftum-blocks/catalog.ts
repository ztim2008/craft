import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  inferCategoryFromMode,
  normalizeCategoryId,
  getCraftumBlockCategories,
} from "@/modules/craftum-blocks/categories";
import type { CraftumBlockCategory } from "@/modules/craftum-blocks/categories-shared";
import {
  parseCraftumBlockSnapshot,
  sanitizeCraftumBlockSnapshot,
  type CraftumBlockSnapshot,
} from "@/modules/craftum-blocks/snapshot";

export type CraftumHeroTexts = {
  title: string;
  subtitle: string;
  button: string;
};

export type CraftumBlockInsert =
  | { mode: "cover"; templateTitle: string }
  | { mode: "design" }
  | { mode: "hero"; heroTexts: CraftumHeroTexts }
  | { mode: "snapshot"; craftumBlock: CraftumBlockSnapshot };

export type CraftumBlockCatalogItem = {
  id: string;
  name: string;
  description: string;
  category?: string;
  featured?: boolean;
  previewUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  insert: CraftumBlockInsert;
};

export type CraftumBlockCatalog = {
  version: number;
  apiVersion: string;
  updatedAt: string;
  source?: string;
  blocks: CraftumBlockCatalogItem[];
};

export type CraftumBlockPublicCatalog = CraftumBlockCatalog & {
  categories: CraftumBlockCategory[];
};

const CATALOG_PATH = join(process.cwd(), "data/craftum-blocks/catalog.json");
const ID_RE = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

function parseInsert(raw: unknown): CraftumBlockInsert {
  if (!raw || typeof raw !== "object") throw new Error("insert обязателен");
  const ins = raw as Record<string, unknown>;
  const mode = String(ins.mode || "").trim();
  if (mode === "cover") {
    const templateTitle = String(ins.templateTitle || "").trim();
    if (!templateTitle) throw new Error("Укажите templateTitle (например cover-03)");
    return { mode: "cover", templateTitle };
  }
  if (mode === "design") return { mode: "design" };
  if (mode === "hero") {
    const heroRaw = ins.heroTexts;
    if (!heroRaw || typeof heroRaw !== "object") throw new Error("heroTexts обязателен");
    const hero = heroRaw as Record<string, unknown>;
    const title = String(hero.title || "").trim();
    const subtitle = String(hero.subtitle || "").trim();
    const button = String(hero.button || "").trim();
    if (!title || !subtitle || !button) throw new Error("Заполните title, subtitle, button");
    return { mode: "hero", heroTexts: { title, subtitle, button } };
  }
  if (mode === "snapshot") {
    const craftumBlock = parseCraftumBlockSnapshot(ins.craftumBlock);
    return { mode: "snapshot", craftumBlock };
  }
  throw new Error("mode: cover | design | hero | snapshot");
}

export function parsePublishPayload(raw: unknown): CraftumBlockCatalogItem {
  if (!raw || typeof raw !== "object") throw new Error("Ожидался JSON");
  const o = raw as Record<string, unknown>;
  const id = String(o.id || "")
    .trim()
    .toLowerCase();
  const name = String(o.name || "").trim();
  const description = String(o.description || "").trim();
  if (!ID_RE.test(id)) throw new Error("id: латиница, цифры, дефис");
  if (!name) throw new Error("Укажите название");
  if (!description) throw new Error("Укажите описание");

  const craftumBlock = sanitizeCraftumBlockSnapshot(parseCraftumBlockSnapshot(o.craftumBlock));
  const block: CraftumBlockCatalogItem = {
    id,
    name,
    description,
    insert: { mode: "snapshot", craftumBlock },
  };
  if (o.featured === true) block.featured = true;
  const categoryRaw = String(o.category || "").trim();
  if (categoryRaw) block.category = normalizeCategoryId(categoryRaw);
  return block;
}

function withCategory(block: CraftumBlockCatalogItem): CraftumBlockCatalogItem {
  const category = block.category
    ? normalizeCategoryId(block.category)
    : inferCategoryFromMode(block.insert.mode);
  return { ...block, category };
}

export function parseCraftumBlockInput(raw: unknown): CraftumBlockCatalogItem {
  if (!raw || typeof raw !== "object") throw new Error("Ожидался объект блока");
  const o = raw as Record<string, unknown>;
  const id = String(o.id || "")
    .trim()
    .toLowerCase();
  const name = String(o.name || "").trim();
  const description = String(o.description || "").trim();
  if (!ID_RE.test(id)) throw new Error("id: латиница, цифры, дефис (2–50 символов)");
  if (!name) throw new Error("Укажите название");
  if (!description) throw new Error("Укажите описание");
  const block: CraftumBlockCatalogItem = {
    id,
    name,
    description,
    insert: parseInsert(o.insert),
  };
  if (o.featured === true) block.featured = true;
  const previewUrl = String(o.previewUrl || "").trim();
  if (previewUrl) block.previewUrl = previewUrl;
  const categoryRaw = String(o.category || "").trim();
  block.category = categoryRaw
    ? normalizeCategoryId(categoryRaw)
    : inferCategoryFromMode(block.insert.mode);
  if (o.publishedAt) block.publishedAt = String(o.publishedAt);
  if (o.updatedAt) block.updatedAt = String(o.updatedAt);
  return block;
}

export function getCraftumBlockCatalog(): CraftumBlockCatalog {
  const raw = readFileSync(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw) as CraftumBlockCatalog;
  if (!Array.isArray(catalog.blocks)) {
    throw new Error("catalog.blocks must be an array");
  }
  return catalog;
}

export function getPublicCraftumBlockCatalog(): CraftumBlockPublicCatalog {
  const catalog = getCraftumBlockCatalog();
  return {
    ...catalog,
    categories: getCraftumBlockCategories(),
    blocks: catalog.blocks.map(withCategory),
  };
}

export function getCraftumBlockById(id: string): CraftumBlockCatalogItem | null {
  return getCraftumBlockCatalog().blocks.find((b) => b.id === id) ?? null;
}

export function saveCraftumBlockCatalog(blocks: CraftumBlockCatalogItem[]): CraftumBlockCatalog {
  const catalog: CraftumBlockCatalog = {
    version: 1,
    apiVersion: "v1",
    updatedAt: new Date().toISOString(),
    source: "craft.nordic-builder.ru",
    blocks,
  };
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return catalog;
}

export function addCraftumBlock(block: CraftumBlockCatalogItem): CraftumBlockCatalog {
  const catalog = getCraftumBlockCatalog();
  if (catalog.blocks.some((b) => b.id === block.id)) {
    throw new Error(`Блок «${block.id}» уже есть`);
  }
  return saveCraftumBlockCatalog([...catalog.blocks, block]);
}

export function upsertCraftumBlock(block: CraftumBlockCatalogItem): CraftumBlockCatalog {
  const catalog = getCraftumBlockCatalog();
  const idx = catalog.blocks.findIndex((b) => b.id === block.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const prev = catalog.blocks[idx];
    block.publishedAt = prev.publishedAt || now;
    block.updatedAt = now;
    return updateCraftumBlock(block.id, block);
  }
  block.publishedAt = now;
  block.updatedAt = now;
  return addCraftumBlock(block);
}

export function updateCraftumBlock(id: string, block: CraftumBlockCatalogItem): CraftumBlockCatalog {
  const catalog = getCraftumBlockCatalog();
  const idx = catalog.blocks.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Блок не найден");
  if (block.id !== id && catalog.blocks.some((b) => b.id === block.id)) {
    throw new Error(`Блок «${block.id}» уже есть`);
  }
  const next = [...catalog.blocks];
  next[idx] = block;
  return saveCraftumBlockCatalog(next);
}

export function removeCraftumBlock(id: string): CraftumBlockCatalog {
  const catalog = getCraftumBlockCatalog();
  const next = catalog.blocks.filter((b) => b.id !== id);
  if (next.length === catalog.blocks.length) throw new Error("Блок не найден");
  return saveCraftumBlockCatalog(next);
}

function uniqueDuplicateId(baseId: string, existing: Set<string>): string {
  let candidate = `${baseId}-copy`;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `${baseId}-copy-${n++}`;
  }
  return candidate;
}

/** Копия блока с новым id (deep clone insert). */
export function duplicateCraftumBlock(
  id: string,
  newId?: string,
): { catalog: CraftumBlockCatalog; block: CraftumBlockCatalogItem } {
  const catalog = getCraftumBlockCatalog();
  const src = catalog.blocks.find((b) => b.id === id);
  if (!src) throw new Error("Блок не найден");

  const ids = new Set(catalog.blocks.map((b) => b.id));
  const targetId = (newId || uniqueDuplicateId(id, ids)).trim().toLowerCase();
  if (!ID_RE.test(targetId)) throw new Error("id: латиница, цифры, дефис");
  if (ids.has(targetId)) throw new Error(`Блок «${targetId}» уже есть`);

  const copy: CraftumBlockCatalogItem = JSON.parse(JSON.stringify(src));
  copy.id = targetId;
  copy.name = `${src.name} (копия)`;
  copy.featured = false;

  const next = saveCraftumBlockCatalog([...catalog.blocks, copy]);
  return { catalog: next, block: copy };
}
