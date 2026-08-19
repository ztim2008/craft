"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateClientFromOrderButton({
  name,
  email,
  phone,
  plan,
  sourceUrl,
  jobId,
  orderId,
}: {
  name: string;
  email: string;
  phone?: string;
  plan: string;
  sourceUrl: string;
  jobId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setError(null);
    const domain = window.prompt("Домен клиента (example.ru)", "");
    if (!domain) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          plan,
          sourceUrl,
          jobId,
          orderId,
          domain,
        }),
      });
      const json = (await response.json()) as { client?: { id: string }; error?: string };
      if (!response.ok || !json.client) throw new Error(json.error || "Ошибка");
      router.push(`/admin/clients/${json.client.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="text-[#2271b1] hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "В клиенты"}
      </button>
      {error ? <p className="text-xs text-[#d63638]">{error}</p> : null}
    </div>
  );
}
