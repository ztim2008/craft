"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    if (!confirm("Отметить заявку оплаченной и выдать ссылку на ZIP?")) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/pay`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={mark}
        disabled={pending}
        className="rounded bg-[#2271b1] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "…" : "Оплачено"}
      </button>
      {error ? <p className="mt-1 text-xs text-[#d63638]">{error}</p> : null}
    </div>
  );
}
