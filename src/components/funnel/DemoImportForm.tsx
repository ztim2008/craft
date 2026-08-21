"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function DemoImportForm({ tone = "light" }: { tone?: "light" | "dark" }) {
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

  const dark = tone === "dark";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className={`text-sm font-medium ${dark ? "text-white/80" : ""}`}>Адрес сайта на Крафтуме</span>
        <input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={
            dark
              ? "w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-white/20 placeholder:text-white/35 focus:ring-2"
              : "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-2"
          }
          placeholder="https://ваш-сайт.ru или *.craftum.io"
        />
      </label>
      <label className={`flex items-start gap-3 text-sm leading-5 ${dark ? "text-white/70" : ""}`}>
        <input
          type="checkbox"
          className="mt-1"
          checked={ownerConfirmed}
          onChange={(e) => setOwnerConfirmed(e.target.checked)}
        />
        <span>Это мой сайт (или есть право на перенос).</span>
      </label>
      {error ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${dark ? "bg-red-500/15 text-red-200" : "bg-red-50 text-red-700"}`}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={
          dark
            ? "w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#121212] disabled:opacity-60"
            : "w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        }
      >
        {pending ? "Запуск…" : "Бесплатное демо одной страницы"}
      </button>
    </form>
  );
}
