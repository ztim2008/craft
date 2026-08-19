import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/modules/clients/store";
import { originFromDomain } from "@/modules/clients/types";
import { getImportJob, listImportJobs } from "@/modules/jobs/store";
import { validateJobPackage } from "@/modules/export/validatePackage";
import { ClientCardForm } from "@/components/admin/ClientCardForm";
import { ClientCrawlButton } from "@/components/admin/ClientCrawlButton";

export const dynamic = "force-dynamic";

export default async function AdminClientCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const [jobs, job] = await Promise.all([
    listImportJobs(),
    client.jobId ? getImportJob(client.jobId) : Promise.resolve(null),
  ]);
  const ready = Boolean(job?.pages.length);
  const report = client.jobId
    ? await validateJobPackage(client.jobId, originFromDomain(client.domain))
    : null;
  const zipOk = ready && report?.ok;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-[#2271b1] hover:underline">
          ← Клиенты
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
        <p className="text-sm text-[#50575e]">{client.domain}</p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <a
          href={`/api/admin/clients/${client.id}/export`}
          className={`rounded px-4 py-2 text-sm font-medium text-white ${
            zipOk ? "bg-[#1d2327]" : "pointer-events-none bg-[#8c8f94]"
          }`}
        >
          Скачать ZIP
        </a>
        <a
          href={`/api/admin/clients/${client.id}/readme`}
          className="rounded border border-[#2271b1] px-4 py-2 text-sm text-[#2271b1]"
        >
          Инструкция (.txt)
        </a>
        <ClientCrawlButton clientId={client.id} plan={client.plan} />
        {job ? (
          <>
            <Link
              href={`/preview/${job.id}/`}
              className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm"
            >
              Preview
            </Link>
            <Link
              href={`/admin/jobs/${job.id}`}
              className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm"
            >
              Контент импорта
            </Link>
          </>
        ) : null}
      </div>

      {job && (job.status === "queued" || job.status === "crawling" || job.status === "collecting") ? (
        <p className="rounded border border-[#dba617] bg-[#fcf9e8] px-3 py-2 text-sm">
          Импорт {job.status}… обновите карточку через минуту.
        </p>
      ) : null}

      {report ? (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            report.ok ? "border-[#00a32a] bg-[#edfaef]" : "border-[#d63638] bg-[#fcf0f1]"
          }`}
        >
          <p className="font-medium">{report.ok ? "Валидатор зелёный" : "Валидатор красный — ZIP закрыт"}</p>
          {report.errors.map((item) => (
            <p key={item}>{item}</p>
          ))}
          {report.warnings.map((item) => (
            <p key={item} className="text-[#50575e]">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded border border-[#dba617] bg-[#fcf9e8] px-3 py-2 text-sm">
          Сначала снимите сайт с карточки или привяжите готовый импорт.
        </p>
      )}

      <ClientCardForm
        client={client}
        jobs={jobs.map((item) => ({ id: item.id, sourceUrl: item.sourceUrl, status: item.status }))}
      />
    </div>
  );
}
