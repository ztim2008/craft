import { DemoImportForm } from "@/components/funnel/DemoImportForm";
import { formatRub } from "@/modules/billing/types";
import { listPlans } from "@/modules/billing/plans";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const plans = await listPlans();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold tracking-tight">Craft</p>
        <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900">
          Вход оператора
        </Link>
      </header>

      <section className="mt-16 grid gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-sm font-medium text-zinc-500">Уход с Craftum</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Сайт как был — на своём домене и хостинге
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Бесплатно снимаем одну страницу и сразу показываем копию 1:1. Дальше заявка
            оператору: пакет ZIP и инструкция уезжают с карточки клиента, не с этой страницы.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-600">
            <li>Не конструктор-подписка: разовая миграция</li>
            <li>Верстка Craftum сохраняется, мы не пересобираем сайт в React</li>
            <li>Техподдержка и установка под ключ — отдельно</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium">Демо за минуту</h2>
          <p className="mt-1 text-sm text-zinc-500">Только главная страница, без оплаты.</p>
          <div className="mt-5">
            <DemoImportForm />
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-3xl font-semibold">{formatRub(plan.amountRub)}</p>
            <p className="mt-1 text-sm text-zinc-500">{plan.pages} · разово</p>
            <p className="mt-3 text-sm text-zinc-600">{plan.summary}</p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-600">
              {plan.features.map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
