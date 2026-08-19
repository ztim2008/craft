import Link from "next/link";
import { getImportJob } from "@/modules/jobs/store";
import { getPageModel } from "@/modules/pageModel/buildPageModel";
import { RebuildModelButton } from "@/components/admin/RebuildModelButton";

export const dynamic = "force-dynamic";

export default async function AdminJobModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getImportJob(id);
  const model = await getPageModel(id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-[#2271b1] hover:underline">
            ← Обзор
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Page Model</h1>
          <p className="text-sm text-[#50575e]">{job?.sourceUrl || id}</p>
        </div>
        <div className="flex gap-2">
          <RebuildModelButton jobId={id} />
          <Link
            href={`/jobs/${id}`}
            className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm"
          >
            Отчёт импорта
          </Link>
          {job?.previewUrl ? (
            <a
              href={job.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm"
            >
              Preview
            </a>
          ) : null}
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
          {model.pages.map((page) => (
            <article
              key={page.path}
              className="space-y-3 rounded border border-[#c3c4c7] bg-white p-4"
            >
              <h2 className="font-medium">
                {page.title || page.path}{" "}
                <span className="text-sm font-normal text-[#50575e]">{page.path}</span>
              </h2>
              {page.sections.map((section) => (
                <details key={section.id} className="rounded border border-[#dcdcde] p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {section.label}{" "}
                    <span className="font-normal text-[#50575e]">
                      · {section.fields.length} полей · {section.forms.length} форм
                    </span>
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm">
                    {section.fields.map((field) => (
                      <li key={field.nodeId} className="border-t border-[#f0f0f1] pt-2">
                        <span className="text-xs uppercase text-[#50575e]">{field.type}</span>
                        {" · "}
                        <strong>{field.label}</strong>
                        <div className="mt-1 break-words text-[#1d2327]">{field.value}</div>
                      </li>
                    ))}
                    {section.forms.map((form) => (
                      <li key={form.id} className="border-t border-[#f0f0f1] pt-2">
                        <span className="text-xs uppercase text-[#50575e]">form</span>
                        {" · "}
                        {form.label}
                        <ul className="mt-1 list-disc pl-5 text-[#50575e]">
                          {form.fields.map((item) => (
                            <li key={item.nodeId}>
                              {item.label} ({item.inputType}
                              {item.name ? `, name=${item.name}` : ""})
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </article>
          ))}
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
