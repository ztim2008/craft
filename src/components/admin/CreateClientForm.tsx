"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type JobOption = { id: string; sourceUrl: string; status: string };

export function CreateClientForm({ jobs }: { jobs: JobOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          domain: data.domain,
          plan: data.plan,
          sourceUrl: data.sourceUrl,
          jobId: data.jobId || undefined,
          email: data.email,
          phone: data.phone,
          notes: data.notes,
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
    <form onSubmit={onSubmit} className="space-y-3 rounded border border-[#c3c4c7] bg-white p-4">
      <h2 className="font-medium">Новый клиент</h2>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Имя</span>
        <input required name="name" className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Домен клиента (уже его, отвязать от Крафтума)</span>
        <input
          required
          name="domain"
          placeholder="client.ru"
          className="w-full rounded border border-[#8c8f94] px-3 py-2"
        />
        <span className="mt-1 block text-xs text-[#50575e]">
          Не адрес *.craftum.io. Новый домен не покупаем — только отвязка от конструктора.
        </span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Тариф</span>
        <select name="plan" className="w-full rounded border border-[#8c8f94] px-3 py-2">
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">URL Craftum</span>
        <input
          required
          name="sourceUrl"
          type="url"
          placeholder="https://….craftum.io/"
          className="w-full rounded border border-[#8c8f94] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Импорт (необязательно)</span>
        <select name="jobId" className="w-full rounded border border-[#8c8f94] px-3 py-2">
          <option value="">— привязать позже —</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.status} · {job.sourceUrl}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Email</span>
        <input name="email" type="email" className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Телефон</span>
        <input name="phone" className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Заметки</span>
        <textarea name="notes" rows={2} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      {error ? <p className="text-sm text-[#d63638]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Сохранение…" : "Создать клиента"}
      </button>
    </form>
  );
}
