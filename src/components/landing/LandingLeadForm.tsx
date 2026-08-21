"use client";

import { formatRub, type Plan } from "@/modules/billing/types";
import { ContactLinks } from "@/components/landing/ContactLinks";
import { useState, type FormEvent } from "react";

const fieldClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-white/20 placeholder:text-white/35 focus:ring-2";

export function LandingLeadForm({ plans }: { plans: Plan[] }) {
  const [planId, setPlanId] = useState(plans[1]?.id || plans[0]?.id || "pro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId, name, email, phone, sourceUrl, domain, comment }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось отправить заявку");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-[28px] border border-white/15 bg-white/[0.05] p-6">
        <p className="font-tight text-lg text-white">Заявка ушла. Напишем вам.</p>
        <p className="text-sm text-white/60">
          Пока можно сразу написать в мессенджер — так быстрее.
        </p>
        <ContactLinks />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className={`cursor-pointer rounded-2xl border p-4 text-sm ${
              planId === plan.id ? "border-white bg-white/[0.08]" : "border-white/15 bg-black/20"
            }`}
          >
            <input
              type="radio"
              name="plan"
              className="sr-only"
              checked={planId === plan.id}
              onChange={() => setPlanId(plan.id)}
            />
            <span className="font-tight font-medium text-white">{plan.name}</span>
            <span className="mt-1 block font-instrument-serif text-2xl">{formatRub(plan.amountRub)}</span>
            <span className="mt-1 block text-white/50">{plan.pages}</span>
          </label>
        ))}
      </div>
      <input
        required
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={fieldClass}
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldClass}
      />
      <input
        placeholder="Телефон"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className={fieldClass}
      />
      <input
        type="url"
        placeholder="Адрес сайта на Крафтуме"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        className={fieldClass}
      />
      <input
        placeholder="Ваш домен, если уже есть (example.ru)"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className={fieldClass}
      />
      <textarea
        rows={3}
        placeholder="Комментарий — необязательно"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className={fieldClass}
      />
      {error ? <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#121212] disabled:opacity-60"
      >
        {pending ? "Отправка…" : "Оставить заявку"}
      </button>
    </form>
  );
}
