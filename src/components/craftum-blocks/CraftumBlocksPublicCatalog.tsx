"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategoryMetaFromList,
  type CraftumBlockCategory,
} from "@/modules/craftum-blocks/categories-shared";

type CatalogBlock = {
  id: string;
  name: string;
  description: string;
  category?: string;
  featured?: boolean;
  previewUrl?: string;
  insertCount?: number;
  insert: {
    mode: string;
    templateTitle?: string;
  };
};

type Catalog = {
  updatedAt: string;
  blocks: CatalogBlock[];
  categories?: CraftumBlockCategory[];
};

function absPreviewUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
}

function sortBlocks(blocks: CatalogBlock[]): CatalogBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const pa = a.insertCount ?? 0;
    const pb = b.insertCount ?? 0;
    if (pa !== pb) return pb - pa;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function CraftumBlocksPublicCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [previewBlock, setPreviewBlock] = useState<CatalogBlock | null>(null);

  const categories = catalog?.categories ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/craftum-blocks", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить каталог");
      setCatalog((await res.json()) as Catalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of catalog?.blocks ?? []) {
      const c = b.category || "custom";
      map.set(c, (map.get(c) || 0) + 1);
    }
    return map;
  }, [catalog]);

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
    return sortBlocks(filtered);
  }, [catalog, search, categoryFilter]);

  return (
    <>
      <section className="border-b border-white/10 bg-gradient-to-b from-violet-500/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <p className="text-sm font-medium tracking-wide text-violet-300">Библиотека для Craftum</p>
          <h1 className="mt-2 max-w-3xl font-instrument-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl lg:text-6xl">
            Готовые блоки для конструктора Craftum
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-white/70">
            Обложки, формы, секции — вставляйте в один клик через расширение Chrome. Блоки редактируются
            штатными инструментами Craftum после установки.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/craftum-blocks"
              className="inline-flex rounded-2xl bg-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400"
            >
              Скачать расширение — бесплатно
            </Link>
            <a
              href="#blocks-grid"
              className="inline-flex rounded-2xl border border-white/15 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Смотреть блоки
            </a>
          </div>
          {catalog && (
            <p className="mt-6 text-sm text-white/40">
              {catalog.blocks.length} блоков в каталоге
              {catalog.updatedAt && <> · обновлено {catalog.updatedAt.slice(0, 10)}</>}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:px-6 md:py-10">
        <aside className="w-full shrink-0 md:w-56 lg:w-64">
          <div className="md:sticky md:top-24">
            <input
              type="search"
              placeholder="Поиск блоков…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35"
            />

            <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                  categoryFilter === null
                    ? "bg-violet-500 text-white"
                    : "border border-white/15 text-white/70"
                }`}
              >
                Все ({catalog?.blocks.length ?? 0})
              </button>
              {categories.map((cat) => {
                const n = countsByCategory.get(cat.id) || 0;
                if (!n) return null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                      categoryFilter === cat.id
                        ? "bg-violet-500 text-white"
                        : "border border-white/15 text-white/70"
                    }`}
                  >
                    {cat.emoji} {cat.name} ({n})
                  </button>
                );
              })}
            </div>

            <nav className="hidden space-y-1 md:block" aria-label="Категории">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  categoryFilter === null
                    ? "bg-violet-500/20 font-medium text-violet-200"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span>Все блоки</span>
                <span className="text-xs text-white/40">{catalog?.blocks.length ?? 0}</span>
              </button>
              {categories.map((cat) => {
                const n = countsByCategory.get(cat.id) || 0;
                if (!n) return null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      categoryFilter === cat.id
                        ? "bg-violet-500/20 font-medium text-violet-200"
                        : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span>
                      {cat.emoji} {cat.name}
                    </span>
                    <span className="text-xs text-white/40">{n}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main id="blocks-grid" className="min-w-0 flex-1">
          {loading && <p className="py-16 text-center text-white/50">Загрузка каталога…</p>}

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {!loading && !error && filteredBlocks.length === 0 && (
            <p className="py-16 text-center text-white/50">Блоки не найдены</p>
          )}

          {!loading && filteredBlocks.length > 0 && (
            <>
              <p className="mb-4 text-sm text-white/45">
                Показано {filteredBlocks.length} из {catalog?.blocks.length ?? 0}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredBlocks.map((block) => {
                  const cat = getCategoryMetaFromList(block.category, categories);
                  const thumb = absPreviewUrl(block.previewUrl);
                  return (
                    <article
                      key={block.id}
                      className={`group overflow-hidden rounded-2xl border transition hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/10 ${
                        block.featured
                          ? "border-violet-400/30 bg-violet-500/10"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setPreviewBlock(block)}
                      >
                        <div className="relative aspect-[4/3] bg-[#141414]">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : block.insert.mode === "snapshot" ? (
                            <iframe
                              title={block.name}
                              src={`/craftum-blocks/preview/${block.id}`}
                              className="pointer-events-none h-full w-full scale-[0.5] origin-top-left"
                              style={{ width: "200%", height: "200%" }}
                              sandbox="allow-same-origin"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                              <span className="text-4xl">{cat.emoji}</span>
                              <span className="text-sm text-white/50">{block.name}</span>
                            </div>
                          )}
                          {block.featured && (
                            <span className="absolute left-2 top-2 rounded-full bg-violet-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
                              Рекомендуем
                            </span>
                          )}
                          {(block.insertCount ?? 0) > 0 && (
                            <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] text-white/90">
                              ↓ {block.insertCount}
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h2 className="font-medium text-white">{block.name}</h2>
                          <p className="mt-1 line-clamp-2 text-sm text-white/55">{block.description}</p>
                          <p className="mt-3 text-xs text-white/35">
                            {cat.emoji} {cat.name}
                          </p>
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="font-tight text-xl font-medium">Как использовать блок</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-white/70">
              <li>1. Установите расширение Craftum Blocks для Chrome / Яндекс / Edge.</li>
              <li>2. Откройте редактор страницы на craftum.com.</li>
              <li>3. Нажмите «+» между секциями → панель «Мои блоки» → выберите блок.</li>
              <li>4. Тексты и дизайн правьте штатными инструментами Craftum.</li>
            </ol>
            <Link
              href="/craftum-blocks"
              className="mt-6 inline-flex rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"
            >
              Инструкция по установке
            </Link>
          </section>
        </main>
      </div>

      {previewBlock && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-preview-title"
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 md:px-6">
            <div className="min-w-0">
              <p id="block-preview-title" className="truncate font-medium text-white">
                {previewBlock.name}
              </p>
              <p className="truncate text-sm text-white/50">{previewBlock.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewBlock(null)}
              className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Закрыть
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-4 md:p-8">
            {absPreviewUrl(previewBlock.previewUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={absPreviewUrl(previewBlock.previewUrl)!}
                alt={previewBlock.name}
                className="max-h-[70vh] max-w-5xl rounded-xl bg-[#141414] object-contain shadow-2xl"
              />
            ) : previewBlock.insert.mode === "snapshot" ? (
              <iframe
                title={previewBlock.name}
                src={`/craftum-blocks/preview/${previewBlock.id}`}
                className="h-[min(70vh,720px)] w-full max-w-5xl rounded-xl bg-white shadow-2xl"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="rounded-xl bg-white/5 p-12 text-center">
                <p className="text-5xl">
                  {getCategoryMetaFromList(previewBlock.category, categories).emoji}
                </p>
                <p className="mt-4 text-lg text-white">{previewBlock.name}</p>
              </div>
            )}
            <Link
              href="/craftum-blocks"
              className="mt-8 rounded-2xl bg-violet-500 px-8 py-3 font-semibold text-white hover:bg-violet-400"
            >
              Скачать расширение и вставить блок
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
