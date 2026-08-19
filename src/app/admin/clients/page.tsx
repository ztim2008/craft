import Link from "next/link";
import { listClients } from "@/modules/clients/store";
import { listImportJobs } from "@/modules/jobs/store";
import { CreateClientForm } from "@/components/admin/CreateClientForm";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const [clients, jobs] = await Promise.all([listClients(), listImportJobs()]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Клиенты</h1>
          <p className="mt-1 text-sm text-[#50575e]">
            Карточка — место выдачи ZIP и инструкции. Миграцию делаете вы (скилл / импорт), не кнопка
            «Оплачено».
          </p>
        </div>
        <div className="overflow-hidden rounded border border-[#c3c4c7] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f6f7f7] text-[#50575e]">
              <tr>
                <th className="px-4 py-2 font-medium">Клиент</th>
                <th className="px-4 py-2 font-medium">Домен</th>
                <th className="px-4 py-2 font-medium">Тариф</th>
                <th className="px-4 py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-[#dcdcde]">
                  <td className="px-4 py-3">
                    <div>{client.name}</div>
                    <div className="max-w-xs truncate text-xs text-[#50575e]">{client.sourceUrl}</div>
                  </td>
                  <td className="px-4 py-3">{client.domain}</td>
                  <td className="px-4 py-3">{client.plan}</td>
                  <td className="px-4 py-3">
                    <Link className="text-[#2271b1] hover:underline" href={`/admin/clients/${client.id}`}>
                      Карточка
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[#50575e]" colSpan={4}>
                    Пока пусто. Создайте клиента справа или из заявки.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <CreateClientForm
        jobs={jobs.map((job) => ({ id: job.id, sourceUrl: job.sourceUrl, status: job.status }))}
      />
    </div>
  );
}
