"use client";

import { useCallback, useEffect, useState } from "react";
import type { CraftumBlockCategory } from "@/modules/craftum-blocks/categories-shared";

type CategoryForm = {
  id: string;
  name: string;
  emoji: string;
  order: string;
};

const EMPTY: CategoryForm = { id: "", name: "", emoji: "📦", order: "" };

export function CraftumBlocksCategoriesPanel({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [categories, setCategories] = useState<CraftumBlockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/craftum-blocks/categories", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить категории");
      const data = (await res.json()) as { categories: CraftumBlockCategory[] };
      setCategories(data.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY);
  }

  function openEdit(cat: CraftumBlockCategory) {
    setEditId(cat.id);
    setForm({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      order: cat.order !== undefined ? String(cat.order) : "",
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const payload = {
      id: form.id.trim().toLowerCase(),
      name: form.name.trim(),
      emoji: form.emoji.trim() || "📦",
      order: form.order.trim() ? Number(form.order) : undefined,
    };
    try {
      const url = editId
        ? `/api/admin/craftum-blocks/categories/${encodeURIComponent(editId)}`
        : "/api/admin/craftum-blocks/categories";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; categories?: CraftumBlockCategory[] };
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
      setCategories(data.categories ?? []);
      setMessage(editId ? "Категория обновлена" : "Категория создана");
      setForm(EMPTY);
      setEditId(null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(cat: CraftumBlockCategory) {
    const others = categories.filter((c) => c.id !== cat.id);
    const reassignTo = others.find((c) => c.id === "custom")?.id || others[0]?.id;
    if (!reassignTo) return;
    if (
      !confirm(
        `Удалить «${cat.name}»? Блоки перейдут в «${others.find((c) => c.id === reassignTo)?.name || reassignTo}».`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/craftum-blocks/categories/${encodeURIComponent(cat.id)}?reassignTo=${encodeURIComponent(reassignTo)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string; categories?: CraftumBlockCategory[] };
      if (!res.ok) throw new Error(data.error || "Ошибка удаления");
      setCategories(data.categories ?? []);
      setMessage(`Категория «${cat.name}» удалена`);
      if (editId === cat.id) {
        setEditId(null);
        setForm(EMPTY);
      }
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1d2327]">Категории блоков</h2>
          <p className="text-sm text-[#646970]">
            Отображаются в админке и в fullscreen-галереи Craftum Blocks
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white hover:bg-[#135e96]"
        >
          + Категория
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-[#c3c4c7]">
          {loading ? (
            <p className="p-6 text-sm text-[#646970]">Загрузка…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#f6f7f7] text-left text-xs uppercase text-[#646970]">
                <tr>
                  <th className="px-4 py-2">Emoji</th>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Название</th>
                  <th className="px-4 py-2">Порядок</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-t border-[#f0f0f1]">
                    <td className="px-4 py-3 text-lg">{cat.emoji}</td>
                    <td className="px-4 py-3 font-mono text-xs">{cat.id}</td>
                    <td className="px-4 py-3">{cat.name}</td>
                    <td className="px-4 py-3 text-[#646970]">{cat.order ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-2 text-[#2271b1] hover:underline"
                        onClick={() => openEdit(cat)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={pending || categories.length <= 1}
                        className="text-[#b32d2e] hover:underline disabled:opacity-40"
                        onClick={() => void onDelete(cat)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={onSave}
          className="rounded-lg border border-[#c3c4c7] bg-[#f6f7f7] p-4 space-y-3"
        >
          <h3 className="font-medium">{editId ? "Редактирование" : "Новая категория"}</h3>
          <label className="block text-sm">
            ID
            <input
              required
              disabled={!!editId}
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              placeholder="pricing"
              className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2 disabled:bg-[#e8e8e8]"
            />
          </label>
          <label className="block text-sm">
            Название
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Emoji
            <input
              required
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Порядок (sort)
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              className="mt-1 w-full rounded border border-[#c3c4c7] px-3 py-2"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "…" : "Сохранить"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={openCreate}
                className="rounded border border-[#c3c4c7] px-4 py-2 text-sm"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
