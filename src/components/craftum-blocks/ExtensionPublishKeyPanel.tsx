"use client";

import { useCallback, useEffect, useState } from "react";

type KeyResponse = {
  configured: boolean;
  publishKey: string | null;
  hint?: string;
};

export function ExtensionPublishKeyPanel() {
  const [data, setData] = useState<KeyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/craftum-blocks/publish-key", { cache: "no-store" });
      if (res.status === 401) {
        setError("Нужна авторизация в Craft");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Не удалось загрузить ключ");
      setData((await res.json()) as KeyResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCopy() {
    if (!data?.publishKey) return;
    try {
      await navigator.clipboard.writeText(data.publishKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать — выделите ключ вручную");
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-[#c3c4c7] bg-[#f6f7f7] p-4 md:p-5">
      <h2 className="text-base font-semibold text-[#1d2327]">Подключение расширения Chrome</h2>
      <p className="mt-1 text-sm text-[#646970]">
        Ключ нужен один раз — чтобы публиковать блоки из Craftum («↑ В каталог»). Обычным пользователям
        ключ не нужен.
      </p>

      {loading && <p className="mt-3 text-sm text-[#646970]">Загрузка…</p>}

      {error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {!loading && data && !data.configured && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {data.hint || "Ключ не настроен на сервере."}
        </p>
      )}

      {!loading && data?.configured && data.publishKey && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full flex-1 overflow-x-auto rounded border border-[#c3c4c7] bg-white px-3 py-2 font-mono text-sm text-[#1d2327]">
              {revealed ? data.publishKey : "•".repeat(Math.min(data.publishKey.length, 24))}
            </code>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="rounded border border-[#c3c4c7] bg-white px-3 py-2 text-sm hover:bg-[#f0f0f1]"
            >
              {revealed ? "Скрыть" : "Показать"}
            </button>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="rounded bg-[#2271b1] px-3 py-2 text-sm font-medium text-white hover:bg-[#135e96]"
            >
              {copied ? "Скопировано ✓" : "Копировать"}
            </button>
          </div>

          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[#646970]">
            <li>Нажмите «Копировать» выше.</li>
            <li>
              В Chrome: иконка расширения Craftum Blocks → вставьте ключ → «Сохранить ключ».
            </li>
            <li>Обновите страницу Craftum (F5) — появится «↑ В каталог».</li>
          </ol>
        </div>
      )}
    </section>
  );
}
