"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClientCrawlButton({
  clientId,
  plan,
}: {
  clientId: string;
  plan: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function crawl() {
    setError(null);
    setPending(true);
    try {
      const homepageOnly = plan !== "pro";
      const response = await fetch(`/api/admin/clients/${clientId}/crawl`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ homepageOnly, maxPages: homepageOnly ? 1 : 50 }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Не удалось запустить съём");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void crawl()}
        disabled={pending}
        className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm disabled:opacity-60"
      >
        {pending ? "Запуск…" : plan === "pro" ? "Снять сайт (Pro)" : "Снять главную (Basic)"}
      </button>
      {error ? <p className="text-sm text-[#d63638]">{error}</p> : null}
    </div>
  );
}
