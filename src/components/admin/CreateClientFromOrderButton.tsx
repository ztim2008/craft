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
  domain: suggestedDomain,
}: {
  name: string;
  email: string;
  phone?: string;
  plan: string;
  sourceUrl: string;
  jobId?: string;
  orderId: string;
  domain?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setError(null);
    let site = sourceUrl.trim();
    if (!site) {
      site = window.prompt("URL сайта на Крафтуме", "") || "";
    }
    if (!site) return;
    const domain = window.prompt(
      "Домен клиента — тот, что уже у него. Отвяжем от Крафтума, новый не покупаем.",
      suggestedDomain || "",
    );
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
          sourceUrl: site,
          jobId: jobId || undefined,
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
