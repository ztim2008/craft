"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RebuildModelButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rebuild() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/model`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось собрать модель");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={rebuild}
        disabled={pending}
        className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Сборка…" : "Собрать модель"}
      </button>
      {error ? <span className="text-xs text-[#d63638]">{error}</span> : null}
    </div>
  );
}
