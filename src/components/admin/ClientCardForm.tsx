"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ClientRecord } from "@/modules/clients/types";

type JobOption = { id: string; sourceUrl: string; status: string };

export function ClientCardForm({
  client,
  jobs,
}: {
  client: ClientRecord;
  jobs: JobOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOk(null);
    setPending(true);
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          domain: data.domain,
          plan: data.plan,
          sourceUrl: data.sourceUrl,
          jobId: data.jobId,
          email: data.email,
          phone: data.phone,
          notes: data.notes,
          adminPassword: data.adminPassword,
          nodePort: data.nodePort,
          hosting: data.hosting,
          includeEditor: Boolean(data.includeEditor),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Ошибка");
      setOk("Сохранено");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded border border-[#c3c4c7] bg-white p-4">
      <h2 className="font-medium">Карточка</h2>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Имя</span>
        <input required name="name" defaultValue={client.name} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Домен</span>
        <input required name="domain" defaultValue={client.domain} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Тариф</span>
        <select name="plan" defaultValue={client.plan} className="w-full rounded border border-[#8c8f94] px-3 py-2">
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">URL Craftum</span>
        <input required name="sourceUrl" defaultValue={client.sourceUrl} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Импорт</span>
        <select name="jobId" defaultValue={client.jobId || ""} className="w-full rounded border border-[#8c8f94] px-3 py-2">
          <option value="">— не привязан —</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.status} · {job.sourceUrl}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Email</span>
        <input name="email" defaultValue={client.email || ""} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Телефон</span>
        <input name="phone" defaultValue={client.phone || ""} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Заметки</span>
        <textarea name="notes" rows={3} defaultValue={client.notes || ""} className="w-full rounded border border-[#8c8f94] px-3 py-2" />
      </label>

      <h2 className="pt-2 font-medium">Пакет и инструкция</h2>
      <p className="text-sm text-[#50575e]">
        Эти поля попадают в ZIP и в INSTRUKTSIYA.txt. Пароль админки клиента, не пароль Craft.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Хостинг</span>
        <select name="hosting" defaultValue={client.hosting || "vps"} className="w-full rounded border border-[#8c8f94] px-3 py-2">
          <option value="vps">VPS / свой сервер</option>
          <option value="beget">Beget</option>
          <option value="timeweb">Timeweb</option>
          <option value="local">Пока только локально</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Порт Node</span>
        <input
          name="nodePort"
          type="number"
          min={1}
          max={65535}
          defaultValue={client.nodePort || 3000}
          className="w-full rounded border border-[#8c8f94] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[#50575e]">Пароль /admin у клиента</span>
        <input
          name="adminPassword"
          defaultValue={client.adminPassword || ""}
          placeholder="пустой — сгенерируется при скачивании ZIP или инструкции"
          className="w-full rounded border border-[#8c8f94] px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="includeEditor"
          defaultChecked={client.includeEditor !== false}
          className="mt-1"
        />
        <span>В инструкции подробно расписать админку и формы (сценарий B). Если снять — акцент на просмотр сайта.</span>
      </label>
      {error ? <p className="text-sm text-[#d63638]">{error}</p> : null}
      {ok ? <p className="text-sm text-[#00a32a]">{ok}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "…" : "Сохранить"}
      </button>
    </form>
  );
}
