"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function PricingForm({ basic, pro }: { basic: number; pro: number }) {
  const router = useRouter();
  const [basicValue, setBasicValue] = useState(String(basic));
  const [proValue, setProValue] = useState(String(pro));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ basic: Number(basicValue), pro: Number(proValue) }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не сохранилось");
      setStatus("Цены на лендинге и в заявках обновлены.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded border border-[#c3c4c7] bg-white p-6">
      <label className="block text-sm">
        <span className="text-xs uppercase text-[#50575e]">Basic, ₽</span>
        <input
          required
          type="number"
          min={1}
          max={10000000}
          step={1}
          value={basicValue}
          onChange={(e) => setBasicValue(e.target.value)}
          className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs uppercase text-[#50575e]">Pro, ₽</span>
        <input
          required
          type="number"
          min={1}
          max={10000000}
          step={1}
          value={proValue}
          onChange={(e) => setProValue(e.target.value)}
          className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
        />
      </label>
      <p className="text-xs text-[#50575e]">
        Уже созданные заявки хранят свою сумму. Новые заявки и главная берут эти цены.
      </p>
      {error ? <p className="text-sm text-[#d63638]">{error}</p> : null}
      {status ? <p className="text-sm text-[#00a32a]">{status}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Сохранение…" : "Сохранить цены"}
      </button>
    </form>
  );
}
