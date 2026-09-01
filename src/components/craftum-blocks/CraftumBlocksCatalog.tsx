"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type InsertMode = "cover" | "design" | "hero";

type CatalogBlock = {
  id: string;
  name: string;
  description: string;
  featured?: boolean;
  insert: {
    mode: InsertMode;
    templateTitle?: string;
    heroTexts?: { title: string; subtitle: string; button: string };
  };
};

type Catalog = {
  updatedAt: string;
  blocks: CatalogBlock[];
};

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  featured: false,
  mode: "cover" as InsertMode,
  templateTitle: "cover-07",
  heroTitle: "Заголовок hero",
  heroSubtitle: "Подзаголовок блока",
  heroButton: "Подробнее",
};

function modeLabel(mode: InsertMode): string {
  if (mode === "cover") return "Cover (шаблон Craftum)";
  if (mode === "hero") return "Hero (дизайн-блок + тексты)";
  return "Дизайн-блок empty-01";
}

function insertSummary(block: CatalogBlock): string {
  const ins = block.insert;
  if (ins.mode === "cover") return `cover → ${ins.templateTitle}`;
  if (ins.mode === "hero") return `hero → «${ins.heroTexts?.title ?? ""}»`;
  return "design-block";
}

export function CraftumBlocksCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pubRes, adminRes] = await Promise.all([
        fetch("/api/craftum-blocks", { cache: "no-store" }),
        fetch("/api/admin/craftum-blocks", { cache: "no-store" }),
      ]);
      if (!pubRes.ok) throw new Error("Не удалось загрузить каталог");
      const pub = (await pubRes.json()) as Catalog;
      setCatalog(pub);
      setCanEdit(adminRes.ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apiUrl = useMemo(() => "https://craft.nordic-builder.ru/api/craftum-blocks", []);

  async function onAddBlock(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const insert =
      form.mode === "cover"
        ? { mode: "cover", templateTitle: form.templateTitle.trim() }
        : form.mode === "hero"
          ? {
              mode: "hero",
              heroTexts: {
                title: form.heroTitle.trim(),
                subtitle: form.heroSubtitle.trim(),
                button: form.heroButton.trim(),
              },
            }
          : { mode: "design" };

    try {
      const res = await fetch("/api/admin/craftum-blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: form.id.trim().toLowerCase(),
          name: form.name.trim(),
          description: form.description.trim(),
          featured: form.featured,
          insert,
        }),
      });
      const data = (await res.json()) as { error?: string; catalog?: Catalog };
      if (!res.ok) throw new Error(data.error || "Не удалось добавить");
      setCatalog(data.catalog ?? null);
      setMessage(`Блок «${form.name}» добавлен. Расширение подхватит за ≤5 мин.`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Удалить блок «${name}»?`)) return;
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/craftum-blocks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; catalog?: Catalog };
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      setCatalog(data.catalog ?? null);
      setMessage(`Блок «${name}» удалён.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-violet-500/10 to-transparent p-8 md:p-10">
        <p className="text-sm font-medium tracking-wide text-violet-300">Каталог · API v1</p>
        <h1 className="mt-3 font-instrument-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
          Блоки Craftum
        </h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-white/70">
          Список блоков для расширения Chrome. Публичный JSON —{" "}
          <a className="text-violet-300 underline hover:text-violet-200" href={apiUrl}>
            {apiUrl}
          </a>
          . После добавления блока обновите редактор Craftum (или подождите до 5 минут — кэш
          расширения).
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/craftum-blocks"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10"
          >
            ← Установка расширения
          </Link>
          {!canEdit && (
            <Link
              href="/login?next=/craftum-blocks/catalog"
              className="rounded-xl bg-violet-500 px-4 py-2 font-medium text-white hover:bg-violet-400"
            >
              Войти для редактирования
            </Link>
          )}
        </div>
      </div>

      {loading && (
        <p className="mt-8 text-center text-white/50">Загрузка каталога…</p>
      )}

      {error && (
        <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {catalog && (
        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-tight text-xl font-medium">Блоки в каталоге</h2>
              <p className="mt-1 text-sm text-white/45">
                {catalog.blocks.length} шт. · обновлено {catalog.updatedAt.slice(0, 19).replace("T", " ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
            >
              Обновить
            </button>
          </div>

          <ul className="mt-6 space-y-3">
            {catalog.blocks.map((block) => (
              <li
                key={block.id}
                className={`rounded-2xl border px-5 py-4 ${
                  block.featured
                    ? "border-violet-400/30 bg-violet-500/10"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {block.name}
                      {block.featured && (
                        <span className="ml-2 rounded-full bg-violet-500/30 px-2 py-0.5 text-xs text-violet-200">
                          featured
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-white/55">{block.description}</p>
                    <p className="mt-2 font-mono text-xs text-white/35">
                      {block.id} · {insertSummary(block)}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onDelete(block.id, block.name)}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canEdit && (
        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
          <h2 className="font-tight text-xl font-medium">Добавить тестовый блок</h2>
          <p className="mt-2 text-sm text-white/50">
            Для cover укажите имя шаблона из каталога Craftum (cover-01, cover-03, cover-07…).
          </p>

          <form onSubmit={onAddBlock} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-white/70">ID (латиница)</span>
              <input
                required
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="hero-cover-07"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-white/70">Название</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="md:col-span-2 block space-y-1 text-sm">
              <span className="text-white/70">Описание</span>
              <input
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-white/70">Режим вставки</span>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as InsertMode }))}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                <option value="cover">Cover (шаблон)</option>
                <option value="hero">Hero (дизайн-блок + тексты)</option>
                <option value="design">Дизайн-блок</option>
              </select>
            </label>
            <label className="flex items-center gap-2 self-end text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              Выделить в панели (featured)
            </label>

            {form.mode === "cover" && (
              <label className="md:col-span-2 block space-y-1 text-sm">
                <span className="text-white/70">templateTitle</span>
                <input
                  required
                  value={form.templateTitle}
                  onChange={(e) => setForm((f) => ({ ...f, templateTitle: e.target.value }))}
                  placeholder="cover-07"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                />
              </label>
            )}

            {form.mode === "hero" && (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="text-white/70">Заголовок</span>
                  <input
                    required
                    value={form.heroTitle}
                    onChange={(e) => setForm((f) => ({ ...f, heroTitle: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-white/70">Кнопка</span>
                  <input
                    required
                    value={form.heroButton}
                    onChange={(e) => setForm((f) => ({ ...f, heroButton: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
                <label className="md:col-span-2 block space-y-1 text-sm">
                  <span className="text-white/70">Подзаголовок</span>
                  <input
                    required
                    value={form.heroSubtitle}
                    onChange={(e) => setForm((f) => ({ ...f, heroSubtitle: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
              </>
            )}

            <div className="md:col-span-2">
              <p className="mb-3 text-xs text-white/40">{modeLabel(form.mode)}</p>
              <button
                type="submit"
                disabled={pending}
                className="rounded-2xl bg-violet-500 px-8 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                {pending ? "Сохраняем…" : "Добавить в каталог"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
