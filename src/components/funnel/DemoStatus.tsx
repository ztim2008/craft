"use client";

import { OrderForm } from "@/components/funnel/OrderForm";
import type { Plan } from "@/modules/billing/types";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type DemoPayload = {
  id: string;
  sourceUrl: string;
  status: string;
  error?: string;
  previewUrl?: string;
  pagesProcessed: number;
  homepageOnly: boolean;
  order?: {
    id: string;
    plan: "basic" | "pro";
    status: string;
  } | null;
};

export function DemoStatus() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const stayForOrder = search.get("order") === "1";
  const [demo, setDemo] = useState<DemoPayload | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [demoRes, plansRes] = await Promise.all([
        fetch(`/api/demo/${params.id}`, { cache: "no-store" }),
        fetch("/api/plans", { cache: "no-store" }),
      ]);
      const data = (await demoRes.json()) as DemoPayload & { error?: string };
      const plansData = (await plansRes.json()) as { plans?: Plan[] };
      if (!demoRes.ok) {
        if (!cancelled) setError(data.error || "Не найдено");
        return;
      }
      if (!cancelled) {
        setDemo(data);
        if (plansData.plans?.length) setPlans(plansData.plans);
      }
    }
    load();
    const timer = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [params.id]);

  useEffect(() => {
    if (!demo || stayForOrder) return;
    if (demo.status === "success" && demo.previewUrl) {
      window.location.replace(demo.previewUrl);
    }
  }, [demo, stayForOrder]);

  if (error) {
    return <main className="p-8 text-sm text-red-700">{error}</main>;
  }
  if (!demo) {
    return <main className="p-8 text-sm text-zinc-500">Загрузка демо…</main>;
  }

  const ready = demo.status === "success" && demo.previewUrl;
  const paid = demo.order?.status === "paid";

  if (ready && !stayForOrder) {
    return (
      <main className="p-8 text-sm text-zinc-600">
        Копия готова, открываем preview…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Craft
        </Link>
        <p className="text-sm text-zinc-500">Статус: {demo.status}</p>
      </header>

      <div>
        <h1 className="text-2xl font-semibold">{stayForOrder ? "Заявка на перенос" : "Снимаем страницу"}</h1>
        <p className="mt-1 break-all text-sm text-zinc-600">{demo.sourceUrl}</p>
        {demo.error ? <p className="mt-2 text-sm text-red-700">{demo.error}</p> : null}
      </div>

      {ready ? (
        <p>
          <a href={demo.previewUrl} className="text-sm text-[#2271b1] underline">
            Открыть копию
          </a>
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Снимаем страницу и картинки. Обычно меньше минуты.</p>
      )}

      {paid ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          Заявка отмечена как оплаченная. Архив собирает оператор и отдаёт с карточки клиента, не
          этой страницы.
        </p>
      ) : null}

      {ready && !paid ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">На свой хостинг</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Preview — демо одной страницы. ZIP и инструкцию пришлёт оператор после заявки. Это не
              самообслуживание экспорта.
            </p>
          </div>
          {demo.order?.status === "pending" ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm">
              Заявка уже есть ({demo.order.plan}). Ждём подтверждение оплаты.
            </div>
          ) : plans.length ? (
            <OrderForm jobId={demo.id} plans={plans} />
          ) : (
            <p className="text-sm text-zinc-500">Загрузка тарифов…</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
