"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("https://kc3748.craftum.io/");
  const [homepageOnly, setHomepageOnly] = useState(true);
  const [maxPages, setMaxPages] = useState(8);
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          homepageOnly,
          maxPages,
          ownerConfirmed,
        }),
      });
      const data = (await response.json()) as { jobId?: string; error?: string };
      if (!response.ok || !data.jobId) {
        throw new Error(data.error || "Не удалось запустить импорт");
      }
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запроса");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium">URL сайта Крафтума</span>
        <input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
          placeholder="https://example.ru"
        />
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={homepageOnly}
          onChange={(e) => setHomepageOnly(e.target.checked)}
        />
        Только главная страница
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Максимум страниц</span>
        <input
          type="number"
          min={1}
          max={50}
          disabled={homepageOnly}
          value={maxPages}
          onChange={(e) => setMaxPages(Number(e.target.value))}
          className="w-32 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
        />
      </label>

      <label className="flex items-start gap-3 text-sm leading-5">
        <input
          type="checkbox"
          className="mt-1"
          checked={ownerConfirmed}
          onChange={(e) => setOwnerConfirmed(e.target.checked)}
        />
        <span>
          Импортирую только сайт, которым владею или на который у меня есть
          соответствующие права. Это не инструмент копирования чужих сайтов.
        </span>
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Запуск…" : "Начать импорт"}
      </button>
    </form>
  );
}
