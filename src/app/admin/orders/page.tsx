import { listOrders } from "@/modules/billing/orders";
import { formatRub } from "@/modules/billing/types";
import { planCopy } from "@/modules/billing/plans";
import { getImportJob } from "@/modules/jobs/store";
import { MarkPaidButton } from "@/components/admin/MarkPaidButton";
import { CreateClientFromOrderButton } from "@/components/admin/CreateClientFromOrderButton";
import { findClientByOrder } from "@/modules/clients/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders();
  const rows = await Promise.all(
    orders.map(async (order) => {
      const job = await getImportJob(order.jobId);
      const client = await findClientByOrder(order.id);
      return { order, sourceUrl: job?.sourceUrl || order.jobId, jobStatus: job?.status, client };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <p className="mt-1 text-sm text-[#50575e]">
          Оплата вручную. ZIP и инструкцию отдаёте с карточки клиента, не с публичного демо.
        </p>
      </div>
      <div className="overflow-hidden rounded border border-[#c3c4c7] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f6f7f7] text-[#50575e]">
            <tr>
              <th className="px-4 py-2 font-medium">Клиент</th>
              <th className="px-4 py-2 font-medium">Сайт</th>
              <th className="px-4 py-2 font-medium">Тариф</th>
              <th className="px-4 py-2 font-medium">Статус</th>
              <th className="px-4 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, sourceUrl, jobStatus, client }) => {
              const plan = planCopy(order.plan);
              return (
                <tr key={order.id} className="border-t border-[#dcdcde] align-top">
                  <td className="px-4 py-3">
                    <div>{order.name}</div>
                    <div className="text-xs text-[#50575e]">{order.email}</div>
                    {order.phone ? <div className="text-xs text-[#50575e]">{order.phone}</div> : null}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <div className="truncate">{sourceUrl}</div>
                    <div className="text-xs text-[#50575e]">импорт: {jobStatus || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {plan?.name} · {formatRub(order.amountRub)}
                  </td>
                  <td className="px-4 py-3">{order.status}</td>
                  <td className="space-y-2 px-4 py-3">
                    <Link className="block text-[#2271b1] hover:underline" href={`/demo/${order.jobId}`}>
                      Демо
                    </Link>
                    <Link className="block text-[#2271b1] hover:underline" href={`/admin/jobs/${order.jobId}`}>
                      Контент
                    </Link>
                    {client ? (
                      <Link className="block text-[#2271b1] hover:underline" href={`/admin/clients/${client.id}`}>
                        Карточка клиента
                      </Link>
                    ) : (
                      <CreateClientFromOrderButton
                        name={order.name}
                        email={order.email}
                        phone={order.phone}
                        plan={order.plan}
                        sourceUrl={sourceUrl}
                        jobId={order.jobId}
                        orderId={order.id}
                      />
                    )}
                    {order.status !== "paid" ? <MarkPaidButton orderId={order.id} /> : (
                      <span className="text-xs text-[#50575e]">токен выдан</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[#50575e]" colSpan={5}>
                  Заявок ещё нет. Они появляются с публичной воронки после демо.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
