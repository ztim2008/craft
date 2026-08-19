"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type JobPayload = {
  id: string;
  sourceUrl: string;
  status: string;
  error?: string;
  pagesFound: number;
  pagesProcessed: number;
  assetsFound: number;
  networkHits: number;
  assetsDownloaded: number;
  assetsFailed: number;
  previewUrl?: string;
  warnings: string[];
  discoveredLinks: string[];
  pages: Array<{
    index: number;
    url: string;
    title: string;
    status: number | null;
    generator: string | null;
    websiteId: string | null;
    pageId: string | null;
    links: number;
    network: number;
    screenshotUrl: string;
    htmlUrl: string;
    previewUrl?: string;
  }>;
};

export default function JobPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/import/${params.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as JobPayload & { error?: string };
      if (!response.ok) {
        if (!cancelled) setError(data.error || "Не найдено");
        return;
      }
      if (!cancelled) setJob(data);
    }
    load();
    const timer = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [params.id]);

  if (error) {
    return <main className="p-8 text-sm text-red-700">{error}</main>;
  }
  if (!job) {
    return <main className="p-8 text-sm text-zinc-500">Загрузка…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
      <div>
        <Link href="/admin/import" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Новый импорт
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Импорт</h1>
        <p className="mt-1 break-all text-sm text-zinc-600">{job.sourceUrl}</p>
        <p className="mt-2 text-sm">
          Статус: <strong>{job.status}</strong>
        </p>
        {job.error ? (
          <p className="mt-2 text-sm text-red-700">{job.error}</p>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Страниц найдено" value={job.pagesFound} />
        <Stat label="Страниц сохранено" value={job.pagesProcessed} />
        <Stat label="Assets скачано" value={job.assetsDownloaded} />
        <Stat label="Network hits" value={job.networkHits} />
      </section>

      {job.previewUrl ? (
        <p className="text-sm">
          <a
            className="rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white"
            href={job.previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Открыть локальную копию
          </a>
        </p>
      ) : null}

      {job.warnings.length > 0 ? (
        <section className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {job.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {job.pages.map((page) => (
        <article
          key={page.index}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        >
          <div className="space-y-1 p-4 text-sm">
            <p className="font-medium">{page.title || page.url}</p>
            <p className="break-all text-zinc-500">{page.url}</p>
            <p className="text-zinc-500">
              HTTP {page.status ?? "—"} · links {page.links} · network{" "}
              {page.network}
              {page.generator ? ` · ${page.generator}` : ""}
              {page.websiteId ? ` · site ${page.websiteId}` : ""}
            </p>
            <p>
              <a className="underline" href={page.htmlUrl} target="_blank">
                HTML original
              </a>
              {page.previewUrl ? (
                <>
                  {" · "}
                  <a className="underline" href={page.previewUrl} target="_blank">
                    Локальная копия
                  </a>
                </>
              ) : null}
              {" · "}
              <a className="underline" href={`/admin/jobs/${job.id}`}>
                Page Model
              </a>
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.screenshotUrl}
            alt={`Screenshot ${page.url}`}
            className="max-h-[640px] w-full border-t border-zinc-100 object-top object-cover"
          />
        </article>
      ))}

      {job.discoveredLinks.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium">Discovered URLs</h2>
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-xs text-zinc-600">
            {job.discoveredLinks.slice(0, 100).map((link) => (
              <li key={link} className="break-all">
                {link}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
