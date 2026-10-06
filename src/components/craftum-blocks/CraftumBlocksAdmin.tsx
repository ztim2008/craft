"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CraftumBlocksCategoriesPanel } from "@/components/craftum-blocks/CraftumBlocksCategoriesPanel";
import { ExtensionPublishKeyPanel } from "@/components/craftum-blocks/ExtensionPublishKeyPanel";
import { BlockPreviewGallery } from "@/components/craftum-blocks/BlockPreviewGallery";
import {
  getCategoryMetaFromList,
  type CraftumBlockCategory,
} from "@/modules/craftum-blocks/categories-shared";

type InsertMode = "cover" | "design" | "hero" | "snapshot";

type CatalogBlock = {
  id: string;
  name: string;
  description: string;
  category?: string;
  featured?: boolean;
  previewUrl?: string;
  insertCount?: number;
  lastInsertedAt?: string;
  publishedAt?: string;
  updatedAt?: string;
  insert: {
    mode: InsertMode;
    templateTitle?: string;
    heroTexts?: { title: string; subtitle: string; button: string };
    craftumBlock?: unknown;
  };
};

type Catalog = {
  updatedAt: string;
  blocks: CatalogBlock[];
  categories?: CraftumBlockCategory[];
};

type EditForm = {
  id: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  previewUrl: string;
  mode: InsertMode;
  templateTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButton: string;
};

const EMPTY_FORM: EditForm = {
  id: "",
  name: "",
  description: "",
  category: "custom",
  featured: false,
  previewUrl: "",
  mode: "design",
  templateTitle: "cover-07",
  heroTitle: "Заголовок",
  heroSubtitle: "Подзаголовок",
  heroButton: "Подробнее",
};

function modeLabel(mode: InsertMode): string {
  if (mode === "cover") return "Cover";
  if (mode === "hero") return "Hero";
  if (mode === "snapshot") return "Snapshot";
  return "Design";
}

function blockToForm(block: CatalogBlock): EditForm {
  const ins = block.insert;
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    category: block.category || "custom",
    featured: !!block.featured,
    previewUrl: block.previewUrl || "",
    mode: ins.mode,
    templateTitle: ins.templateTitle || "cover-07",
    heroTitle: ins.heroTexts?.title || "",
    heroSubtitle: ins.heroTexts?.subtitle || "",
    heroButton: ins.heroTexts?.button || "",
  };
}

function formToPayload(form: EditForm, original?: CatalogBlock) {
  let insert: CatalogBlock["insert"];
  if (original?.insert.mode === "snapshot") {
    insert = original.insert;
  } else if (form.mode === "cover") {
    insert = { mode: "cover", templateTitle: form.templateTitle.trim() };
  } else if (form.mode === "hero") {
    insert = {
      mode: "hero",
      heroTexts: {
        title: form.heroTitle.trim(),
        subtitle: form.heroSubtitle.trim(),
        button: form.heroButton.trim(),
      },
    };
  } else {
    insert = { mode: "design" };
  }

  return {
    id: form.id.trim().toLowerCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    featured: form.featured,
    previewUrl: form.previewUrl.trim() || undefined,
    insert,
  };
}

type SortKey =
  | "name-asc"
  | "name-desc"
  | "inserts-desc"
  | "inserts-asc"
  | "updated-desc"
  | "category-asc";

const SORT_LABELS: Record<SortKey, string> = {
  "name-asc": "Название А→Я",
  "name-desc": "Название Я→А",
  "inserts-desc": "Популярность ↓",
  "inserts-asc": "Популярность ↑",
  "updated-desc": "Недавно обновлены",
  "category-asc": "Категория",
};

function sortBlocks(blocks: CatalogBlock[], sortKey: SortKey, categories: CraftumBlockCategory[]) {
  const catOrder = new Map(categories.map((c, i) => [c.id, c.order ?? i]));
  return [...blocks].sort((a, b) => {
    switch (sortKey) {
      case "name-desc":
        return b.name.localeCompare(a.name, "ru");
      case "inserts-desc":
        return (b.insertCount ?? 0) - (a.insertCount ?? 0) || a.name.localeCompare(b.name, "ru");
      case "inserts-asc":
        return (a.insertCount ?? 0) - (b.insertCount ?? 0) || a.name.localeCompare(b.name, "ru");
      case "updated-desc":
        return (
          String(b.updatedAt || b.publishedAt || "").localeCompare(
            String(a.updatedAt || a.publishedAt || ""),
          ) || a.name.localeCompare(b.name, "ru")
        );
      case "category-asc": {
        const ca = catOrder.get(a.category || "custom") ?? 999;
        const cb = catOrder.get(b.category || "custom") ?? 999;
        return ca - cb || a.name.localeCompare(b.name, "ru");
      }
      case "name-asc":
      default:
        return a.name.localeCompare(b.name, "ru");
    }
  });
}

function absPreviewUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
}

export function CraftumBlocksAdmin() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("inserts-desc");
  const [editOpen, setEditOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<CatalogBlock | null>(null);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [previewBlock, setPreviewBlock] = useState<CatalogBlock | null>(null);
  const [tab, setTab] = useState<"blocks" | "categories">("blocks");

  const categories = catalog?.categories ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/craftum-blocks", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить каталог");
      setCatalog((await res.json()) as Catalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredBlocks = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    const filtered = catalog.blocks.filter((b) => {
      if (categoryFilter && (b.category || "custom") !== categoryFilter) return false;
      if (!q) return true;
      return (
        b.id.includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      );
    });
    return sortBlocks(filtered, sortKey, categories);
  }, [catalog, search, categoryFilter, sortKey, categories]);

  const totalInserts = useMemo(
    () => (catalog?.blocks ?? []).reduce((sum, b) => sum + (b.insertCount ?? 0), 0),
    [catalog],
  );

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of catalog?.blocks ?? []) {
      const c = b.category || "custom";
      map.set(c, (map.get(c) || 0) + 1);
    }
    return map;
  }, [catalog]);

  function openCreate() {
    setEditBlock(null);
    setForm({ ...EMPTY_FORM, id: "", name: "", description: "" });
    setEditOpen(true);
  }

  function openEdit(block: CatalogBlock) {
    setEditBlock(block);
    setForm(blockToForm(block));
    setEditOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const payload = formToPayload(form, editBlock ?? undefined);
      const url = editBlock
        ? `/api/admin/craftum-blocks/${encodeURIComponent(editBlock.id)}`
        : "/api/admin/craftum-blocks";
      const res = await fetch(url, {
        method: editBlock ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; catalog?: Catalog };
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
      setCatalog(data.catalog ?? null);
      setMessage(editBlock ? `Блок «${form.name}» обновлён` : `Блок «${form.name}» создан`);
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(block: CatalogBlock) {
    if (!confirm(`Удалить «${block.name}» (${block.id})?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/craftum-blocks/${encodeURIComponent(block.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; catalog?: Catalog };
      if (!res.ok) throw new Error(data.error || "Ошибка удаления");
      setCatalog(data.catalog ?? null);
      setMessage(`Блок «${block.name}» удалён`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function onDuplicate(block: CatalogBlock) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/craftum-blocks/${encodeURIComponent(block.id)}/duplicate`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      );
      const data = (await res.json()) as { error?: string; catalog?: Catalog; block?: CatalogBlock };
      if (!res.ok) throw new Error(data.error || "Ошибка дублирования");
      setCatalog(data.catalog ?? null);
      setMessage(`Создана копия: ${data.block?.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function onPreviewUploaded(blockId: string, previewUrl: string, catalog?: Catalog) {
    if (catalog) setCatalog(catalog);
    if (editBlock?.id === blockId) {
      setForm((f) => ({ ...f, previewUrl }));
    }
    setMessage("Превью сохранено и оптимизировано (WebP 4:3)");
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex gap-1 border-b border-[#c3c4c7]">
        <button
          type="button"
          onClick={() => setTab("blocks")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "blocks"
              ? "border-b-2 border-[#2271b1] text-[#2271b1]"
              : "text-[#646970] hover:text-[#1d2327]"
          }`}
        >
          Блоки
        </button>
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "categories"
              ? "border-b-2 border-[#2271b1] text-[#2271b1]"
              : "text-[#646970] hover:text-[#1d2327]"
          }`}
        >
          Категории
        </button>
      </div>

      {tab === "categories" && <CraftumBlocksCategoriesPanel onChanged={() => void load()} />}

      {tab === "blocks" && (
        <>
      <ExtensionPublishKeyPanel />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d2327]">Craftum Blocks</h1>
          <p className="mt-1 text-sm text-[#646970]">
            Каталог блоков для расширения · {catalog?.blocks.length ?? 0} шт.
            {totalInserts > 0 && <> · {totalInserts} вставок</>}
            {catalog?.updatedAt && (
              <> · обновлено {catalog.updatedAt.slice(0, 19).replace("T", " ")}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-[#c3c4c7] bg-white px-4 py-2 text-sm hover:bg-[#f6f7f7]"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white hover:bg-[#135e96]"
          >
            + Добавить блок
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </p>
      )}

      <div className="flex min-h-[560px] overflow-hidden rounded-lg border border-[#c3c4c7] bg-white shadow-sm">
        <aside className="w-56 shrink-0 border-r border-[#c3c4c7] bg-[#f6f7f7] p-3">
          <input
            type="search"
            placeholder="Поиск…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded border border-[#c3c4c7] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
              categoryFilter === null
                ? "border-l-4 border-[#2271b1] bg-white font-medium"
                : "hover:bg-white/80"
            }`}
          >
            <span>Все блоки</span>
            <span className="text-xs text-[#646970]">{catalog?.blocks.length ?? 0}</span>
          </button>
          {categories.map((cat) => {
            const count = countsByCategory.get(cat.id) || 0;
            if (count === 0 && categoryFilter !== cat.id) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
                  categoryFilter === cat.id
                    ? "border-l-4 border-[#2271b1] bg-white font-medium"
                    : "hover:bg-white/80"
                }`}
              >
                <span>
                  {cat.emoji} {cat.name}
                </span>
                <span className="text-xs text-[#646970]">{count}</span>
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#646970]">
              Показано {filteredBlocks.length} из {catalog?.blocks.length ?? 0}
            </p>
            <label className="flex items-center gap-2 text-sm text-[#646970]">
              Сортировка
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded border border-[#c3c4c7] px-3 py-1.5 text-sm text-[#1d2327]"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading && <p className="text-center text-sm text-[#646970]">Загрузка…</p>}
          {!loading && filteredBlocks.length === 0 && (
            <p className="text-center text-sm text-[#646970]">Блоки не найдены</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredBlocks.map((block) => {
              const cat = getCategoryMetaFromList(block.category, categories);
              const thumb = absPreviewUrl(block.previewUrl);
              return (
                <article
                  key={block.id}
                  className="overflow-hidden rounded-lg border border-[#c3c4c7] bg-white transition hover:border-[#2271b1] hover:shadow-md"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setPreviewBlock(block)}
                  >
                    <div className="relative aspect-[4/3] bg-[#f0f0f1]">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-contain object-center"
                        />
                      ) : block.insert.mode === "snapshot" ? (
                        <iframe
                          title={block.name}
                          src={`/craftum-blocks/preview/${block.id}`}
                          className="pointer-events-none h-full w-full scale-[0.5] origin-top-left"
                          style={{ width: "200%", height: "200%" }}
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">{cat.emoji}</div>
                      )}
                      {block.featured && (
                        <span className="absolute left-2 top-2 rounded bg-[#6d5efc] px-2 py-0.5 text-xs text-white">
                          Рекомендуем
                        </span>
                      )}
                      {(block.insertCount ?? 0) > 0 && (
                        <span className="absolute right-2 top-2 rounded bg-[#1d2327]/80 px-2 py-0.5 text-xs text-white">
                          ↓ {block.insertCount}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-[#1d2327]">{block.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[#646970]">{block.description}</p>
                      <p className="mt-2 font-mono text-[10px] text-[#a7aaad]">
                        {block.id} · {cat.emoji} {cat.name} · {modeLabel(block.insert.mode)}
                        {(block.insertCount ?? 0) > 0 && <> · {block.insertCount} вставок</>}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-1 border-t border-[#f0f0f1] px-2 py-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => openEdit(block)}
                      className="rounded px-2 py-1 text-xs text-[#2271b1] hover:bg-[#f0f6fc]"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onDuplicate(block)}
                      className="rounded px-2 py-1 text-xs text-[#646970] hover:bg-[#f6f7f7]"
                    >
                      Дублировать
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onDelete(block)}
                      className="rounded px-2 py-1 text-xs text-[#b32d2e] hover:bg-red-50"
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {editBlock ? `Редактировать: ${editBlock.name}` : "Новый блок"}
            </h2>
            <form onSubmit={onSave} className="mt-4 space-y-3 text-sm">
              {!editBlock && (
                <label className="block">
                  ID (латиница)
                  <input
                    required
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
                  />
                </label>
              )}
              <label className="block">
                Название
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
                />
              </label>
              <label className="block">
                Описание
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
                />
              </label>
              <label className="block">
                Категория
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                />
                Рекомендуем (показывать выше в панели Craftum)
              </label>

              {editBlock && (
                <BlockPreviewGallery
                  blockId={editBlock.id}
                  previewUrl={form.previewUrl}
                  disabled={pending}
                  onUploaded={(url, _meta, nextCatalog) => {
                    void onPreviewUploaded(
                      editBlock.id,
                      url,
                      (nextCatalog as Catalog | undefined) ?? catalog ?? undefined,
                    );
                  }}
                />
              )}

              {!editBlock && (
                <>
                  <label className="block">
                    Режим
                    <select
                      value={form.mode}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, mode: e.target.value as InsertMode }))
                      }
                      className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
                    >
                      <option value="cover">Cover</option>
                      <option value="hero">Hero</option>
                      <option value="design">Design</option>
                    </select>
                  </label>
                  {form.mode === "cover" && (
                    <label className="block">
                      templateTitle
                      <input
                        required
                        value={form.templateTitle}
                        onChange={(e) => setForm((f) => ({ ...f, templateTitle: e.target.value }))}
                        className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
                      />
                    </label>
                  )}
                </>
              )}

              {editBlock?.insert.mode === "snapshot" && (
                <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Snapshot: содержимое меняется через Craftum («↑ В каталог»). Здесь — название,
                  категория, превью, «Рекомендуем».
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded border border-[#c3c4c7] px-4 py-2 hover:bg-[#f6f7f7]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded bg-[#2271b1] px-4 py-2 font-medium text-white hover:bg-[#135e96] disabled:opacity-50"
                >
                  {pending ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewBlock && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#1d2327]/80 backdrop-blur-sm"
          onClick={() => setPreviewBlock(null)}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-white">
            <div>
              <p className="font-medium">{previewBlock.name}</p>
              <p className="text-sm text-white/60">{previewBlock.id}</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewBlock(null)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              Закрыть
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {absPreviewUrl(previewBlock.previewUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={absPreviewUrl(previewBlock.previewUrl)!}
                alt={previewBlock.name}
                className="max-h-full max-w-5xl rounded-lg bg-[#f0f0f1] object-contain shadow-2xl"
              />
            ) : previewBlock.insert.mode === "snapshot" ? (
              <iframe
                title={previewBlock.name}
                src={`/craftum-blocks/preview/${previewBlock.id}`}
                className="h-[80vh] w-full max-w-5xl rounded-lg bg-white shadow-2xl"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="rounded-lg bg-white p-12 text-center shadow-2xl">
                <p className="text-6xl">{getCategoryMetaFromList(previewBlock.category, categories).emoji}</p>
                <p className="mt-4 text-lg">{previewBlock.name}</p>
                <p className="text-sm text-[#646970]">{previewBlock.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
