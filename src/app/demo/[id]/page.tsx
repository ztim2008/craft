"use client";

import { OrderForm } from "@/components/funnel/OrderForm";
import { PLANS } from "@/modules/billing/plans";
import Link from "next/link";
import { useParams } from "next/navigation";
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
    downloadToken?: string;
  } | null;
};

export default function DemoPage() {
  const params = useParams<{ id: string }>();
  const [demo, setDemo] = useState<DemoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/demo/${params.id}`, { cache: "no-store" });
      const data = (await response.json()) as DemoPayload & { error?: string };
      if (!response.ok) {
        if (!cancelled) setError(data.error || "Не найдено");
        return;
      }
      if (!cancelled) setDemo(data);
    }
    load();
    const timer = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [params.id]);

  if (error) {
    return <main className="p-8 text-sm text-red-700">{error}</main>;
  }
  if (!demo) {
    return <main className="p-8 text-sm text-zinc-500">Загрузка демо…</main>;
  }

  const ready = demo.status === "success" && demo.previewUrl;
  const paid = demo.order?.status === "paid";
  const downloadHref =
    paid && demo.order?.downloadToken
      ? `/api/demo/${demo.id}/export?token=${encodeURIComponent(demo.order.downloadToken)}`
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Craft
        </Link>
        <p className="text-sm text-zinc-500">Статус: {demo.status}</p>
      </header>

      <div>
        <h1 className="text-2xl font-semibold">Ваша копия</h1>
        <p className="mt-1 break-all text-sm text-zinc-600">{demo.sourceUrl}</p>
        {demo.error ? <p className="mt-2 text-sm text-red-700">{demo.error}</p> : null}
      </div>

      {ready ? (
        <p>
          <a
            href={demo.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Открыть preview
          </a>
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Снимаем страницу и картинки. Обычно меньше минуты.</p>
      )}

      {ready ? (
        <iframe
          title="Preview"
          src={demo.previewUrl}
          className="h-[560px] w-full rounded-2xl border border-zinc-200 bg-white"
        />
      ) : null}

      {paid && demo.order?.plan === "pro" && demo.status !== "success" ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          Pro оплачен, собираем весь сайт. ZIP появится, когда статус снова станет success.
        </p>
      ) : null}

      {downloadHref ? (
        <a
          href={downloadHref}
          className="inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white"
        >
          Скачать пакет (ZIP)
        </a>
      ) : null}

      {ready && !paid ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">На свой хостинг с админкой</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Preview — это демо. ZIP с сайтом, формой на email и инструкцией деплоя выдаём после
              оплаты тарифа. Basic — эта страница. Pro — все страницы сайта.
            </p>
          </div>
          {demo.order?.status === "pending" ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm">
              Заявка уже есть ({demo.order.plan}). Ждём подтверждение оплаты — обновите страницу
              позже.
            </div>
          ) : (
            <OrderForm jobId={demo.id} plans={[PLANS.basic, PLANS.pro]} selected={PLANS.basic} />
          )}
        </section>
      ) : null}
    </main>
  );
}
