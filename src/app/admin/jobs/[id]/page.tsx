import Link from "next/link";
import { getContent } from "@/modules/content/store";
import { listLeads } from "@/modules/forms/leads";
import { getImportJob } from "@/modules/jobs/store";
import { getPageModel } from "@/modules/pageModel/buildPageModel";
import { RebuildModelButton } from "@/components/admin/RebuildModelButton";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

export default async function AdminJobModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getImportJob(id);
  const model = await getPageModel(id);
  const content = await getContent(id);
  const leads = await listLeads(id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-[#2271b1] hover:underline">
            ← Обзор
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Редактор страниц</h1>
          <p className="text-sm text-[#50575e]">{job?.sourceUrl || id}</p>
        </div>
        <div className="flex gap-2">
          <RebuildModelButton jobId={id} />
          <a
            href={`/api/admin/jobs/${id}/export`}
            className="rounded bg-[#1d2327] px-4 py-2 text-sm font-medium text-white"
          >
            Скачать пакет
          </a>
          <Link
            href={`/jobs/${id}`}
            className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm"
          >
            Отчёт импорта
          </Link>
        </div>
      </div>

      {!model ? (
        <p className="rounded border border-[#dba617] bg-[#fcf9e8] px-3 py-2 text-sm">
          Page Model ещё нет — нажмите «Собрать модель».
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Страниц" value={model.counts.pages} />
            <Stat label="Секций" value={model.counts.sections} />
            <Stat label="Полей" value={model.counts.fields} />
            <Stat label="Форм" value={model.counts.forms} />
          </div>
          {content.publishedAt ? (
            <p className="text-xs text-[#50575e]">Последняя публикация: {content.publishedAt}</p>
          ) : null}
          <ContentEditor
            jobId={id}
            model={model}
            initial={content}
            previewUrl={job?.previewUrl}
          />
          <section className="rounded border border-[#c3c4c7] bg-white p-4">
            <h2 className="font-medium">Заявки</h2>
            <p className="mt-1 text-sm text-[#50575e]">
              Укажите email у формы, сохраните, затем отправьте тестовую заявку в Preview.
              Без SMTP заявки всё равно появятся здесь.
            </p>
            {leads.length === 0 ? (
              <p className="mt-3 text-sm text-[#50575e]">Пока нет заявок.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {leads.map((lead) => (
                  <li key={lead.id} className="border-t border-[#f0f0f1] pt-3">
                    <div className="text-xs text-[#50575e]">
                      {lead.at} · {lead.emailed ? "email отправлен" : "только в админке"} · {lead.to}
                    </div>
                    {Object.entries(lead.fields).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {value}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[#c3c4c7] bg-white p-4">
      <p className="text-sm text-[#50575e]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
