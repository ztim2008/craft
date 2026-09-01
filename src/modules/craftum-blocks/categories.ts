import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { CraftumBlockCategory } from "@/modules/craftum-blocks/categories-shared";

export type { CraftumBlockCategory } from "@/modules/craftum-blocks/categories-shared";

export type CategoriesFile = {
  version: number;
  updatedAt: string;
  categories: CraftumBlockCategory[];
};

const CATEGORIES_PATH = join(process.cwd(), "data/craftum-blocks/categories.json");
const CATALOG_PATH = join(process.cwd(), "data/craftum-blocks/catalog.json");
const ID_RE = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

const SEED: CraftumBlockCategory[] = [
  { id: "hero", name: "Обложки", emoji: "🎯", order: 0 },
  { id: "custom", name: "Дизайн", emoji: "🎨", order: 100 },
];

function readCategoriesFile(): CategoriesFile {
  if (!existsSync(CATEGORIES_PATH)) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      categories: SEED,
    };
  }
  const raw = readFileSync(CATEGORIES_PATH, "utf8");
  const data = JSON.parse(raw) as CategoriesFile;
  if (!Array.isArray(data.categories)) {
    throw new Error("categories.json: categories must be an array");
  }
  return data;
}

function writeCategoriesFile(categories: CraftumBlockCategory[]): CategoriesFile {
  const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const file: CategoriesFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: sorted,
  };
  writeFileSync(CATEGORIES_PATH, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}

export function getCraftumBlockCategories(): CraftumBlockCategory[] {
  return readCategoriesFile().categories;
}

function reassignBlocksCategory(fromId: string, toId: string): void {
  if (!existsSync(CATALOG_PATH)) return;
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as {
    blocks: Array<{ category?: string }>;
    updatedAt?: string;
  };
  if (!Array.isArray(catalog.blocks)) return;
  let changed = false;
  for (const block of catalog.blocks) {
    const c = String(block.category || "").trim() || "custom";
    if (c === fromId) {
      block.category = toId;
      changed = true;
    }
  }
  if (!changed) return;
  catalog.updatedAt = new Date().toISOString();
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

function categoryMap(): Map<string, CraftumBlockCategory> {
  return new Map(getCraftumBlockCategories().map((c) => [c.id, c]));
}

export function normalizeCategoryId(categoryId: string | null | undefined): string {
  const id = String(categoryId || "").trim();
  if (!id) return "custom";
  const map = categoryMap();
  return map.has(id) ? id : map.has("custom") ? "custom" : [...map.keys()][0] || "custom";
}

export function getCategoryMeta(categoryId: string | null | undefined): CraftumBlockCategory {
  const id = normalizeCategoryId(categoryId);
  const map = categoryMap();
  return map.get(id) ?? { id: "custom", name: "Дизайн", emoji: "🎨" };
}

export function inferCategoryFromMode(mode: string): string {
  const map = categoryMap();
  if (mode === "cover" || mode === "hero") return map.has("hero") ? "hero" : normalizeCategoryId(null);
  if (mode === "design") return map.has("design-blocks") ? "design-blocks" : normalizeCategoryId(null);
  return normalizeCategoryId(null);
}

export function parseCategoryInput(raw: unknown): CraftumBlockCategory {
  if (!raw || typeof raw !== "object") throw new Error("Ожидался объект категории");
  const o = raw as Record<string, unknown>;
  const id = String(o.id || "")
    .trim()
    .toLowerCase();
  const name = String(o.name || "").trim();
  const emoji = String(o.emoji || "").trim() || "📦";
  if (!ID_RE.test(id)) throw new Error("id: латиница, цифры, дефис");
  if (!name) throw new Error("Укажите название категории");
  const orderRaw = o.order;
  const order =
    orderRaw === undefined || orderRaw === null || orderRaw === ""
      ? undefined
      : Number(orderRaw);
  if (order !== undefined && !Number.isFinite(order)) throw new Error("order должен быть числом");
  return order !== undefined ? { id, name, emoji, order } : { id, name, emoji };
}

export function addCraftumBlockCategory(input: CraftumBlockCategory): CategoriesFile {
  const categories = getCraftumBlockCategories();
  if (categories.some((c) => c.id === input.id)) {
    throw new Error(`Категория «${input.id}» уже есть`);
  }
  const order = input.order ?? (categories.length ? Math.max(...categories.map((c) => c.order ?? 0)) + 10 : 0);
  return writeCategoriesFile([...categories, { ...input, order }]);
}

export function updateCraftumBlockCategory(
  id: string,
  input: CraftumBlockCategory,
): CategoriesFile {
  const categories = getCraftumBlockCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Категория не найдена");
  if (input.id !== id && categories.some((c) => c.id === input.id)) {
    throw new Error(`Категория «${input.id}» уже есть`);
  }
  const next = [...categories];
  next[idx] = input;
  if (input.id !== id) {
    reassignBlocksCategory(id, input.id);
  }
  return writeCategoriesFile(next);
}

export function removeCraftumBlockCategory(id: string, reassignTo = "custom"): CategoriesFile {
  const categories = getCraftumBlockCategories();
  if (categories.length <= 1) throw new Error("Нельзя удалить последнюю категорию");
  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Категория не найдена");
  const target = normalizeCategoryId(reassignTo);
  if (id === target) throw new Error("Выберите другую категорию для переноса блоков");

  reassignBlocksCategory(id, target);

  const next = categories.filter((c) => c.id !== id);
  return writeCategoriesFile(next);
}

/** @deprecated use getCraftumBlockCategories() */
export const CRAFTUM_BLOCK_CATEGORIES = SEED;
