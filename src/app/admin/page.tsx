import Link from "next/link";
import { listImportJobs } from "@/modules/jobs/store";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const jobs = await listImportJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Обзор</h1>
          <p className="mt-1 text-sm text-[#50575e]">Импорты и Page Model</p>
        </div>
        <Link
          href="/admin/import"
          className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white"
        >
          Новый импорт
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-[#c3c4c7] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f6f7f7] text-[#50575e]">
            <tr>
              <th className="px-4 py-2 font-medium">Сайт</th>
              <th className="px-4 py-2 font-medium">Статус</th>
              <th className="px-4 py-2 font-medium">Страниц</th>
              <th className="px-4 py-2 font-medium">Секции / поля / формы</th>
              <th className="px-4 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-[#dcdcde]">
                <td className="max-w-xs truncate px-4 py-2">{job.sourceUrl}</td>
                <td className="px-4 py-2">{job.status}</td>
                <td className="px-4 py-2">{job.pagesProcessed}</td>
                <td className="px-4 py-2 text-[#50575e]">
                  {job.pageModelCounts
                    ? `${job.pageModelCounts.sections} / ${job.pageModelCounts.fields} / ${job.pageModelCounts.forms}`
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <Link className="text-[#2271b1] hover:underline" href={`/admin/jobs/${job.id}`}>
                    Page Model
                  </Link>
                  {" · "}
                  <Link className="text-[#2271b1] hover:underline" href={`/jobs/${job.id}`}>
                    Отчёт
                  </Link>
                </td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[#50575e]" colSpan={5}>
                  Пока нет импортов. Сделайте первый на странице Импорт.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
