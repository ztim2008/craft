"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function DemoImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/demo/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, ownerConfirmed }),
      });
      const data = (await response.json()) as { jobId?: string; error?: string };
      if (!response.ok || !data.jobId) throw new Error(data.error || "Не удалось запустить демо");
      router.push(`/demo/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запроса");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">URL сайта на Craftum</span>
        <input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-2"
          placeholder="https://your-site.craftum.io/"
        />
      </label>
      <label className="flex items-start gap-3 text-sm leading-5">
        <input
          type="checkbox"
          className="mt-1"
          checked={ownerConfirmed}
          onChange={(e) => setOwnerConfirmed(e.target.checked)}
        />
        <span>Это мой сайт (или есть право на перенос). Чужие сайты не импортирую.</span>
      </label>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Запуск…" : "Бесплатное демо одной страницы"}
      </button>
    </form>
  );
}
