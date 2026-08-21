"use client";

import { formatRub, type Plan } from "@/modules/billing/types";
import { suggestDomainFromSourceUrl } from "@/modules/clients/types";
import { ContactLinks } from "@/components/landing/ContactLinks";
import { useState, type FormEvent } from "react";

export function OrderForm({
  jobId,
  plans,
  sourceUrl,
}: {
  jobId: string;
  plans: Plan[];
  sourceUrl?: string;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id || "basic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [domain, setDomain] = useState(() => suggestDomainFromSourceUrl(sourceUrl || ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/demo/${jobId}/order`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId, name, email, phone, domain }),
      });
      const data = (await response.json()) as { error?: string; orderId?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось отправить заявку");
      if (data.orderId) localStorage.setItem(`craft-order-${jobId}`, data.orderId);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
        <p>
          Заявка принята. Домен остаётся вашим — отвяжем его от Крафтума, когда сайт уже будет на
          вашем хостинге.
        </p>
        <p className="text-emerald-900/80">Напишите, если хотите уточнить тариф или сроки:</p>
        <ContactLinks tone="light" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className={`cursor-pointer rounded-xl border p-4 text-sm ${
              planId === plan.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
            }`}
          >
            <input
              type="radio"
              name="plan"
              className="mr-2"
              checked={planId === plan.id}
              onChange={() => setPlanId(plan.id)}
            />
            <span className="font-medium">{plan.name}</span>
            <span className="mt-1 block text-lg font-semibold">{formatRub(plan.amountRub)}</span>
            <span className="mt-1 block text-zinc-500">{plan.pages}</span>
          </label>
        ))}
      </div>
      <input
        required
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
      />
      <label className="block space-y-1">
        <span className="text-xs text-zinc-500">Ваш домен (уже ваш, не покупаем заново)</span>
        <input
          required
          placeholder="example.ru"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <input
        placeholder="Телефон (необязательно)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
      />
      <p className="text-xs text-zinc-500">
        Домен отвяжем от Крафтума после выкладки на ваш хостинг. Сопровождение — по договорённости.
        Написать: Telegram t.me/bilarius, VK vk.ru/bilarius.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Отправка…" : "Оставить заявку на переезд"}
      </button>
    </form>
  );
}
