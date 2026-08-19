import { createId } from "@/lib/ids";
import { getOrder, saveOrder } from "@/modules/billing/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  if (order.status === "cancelled") {
    return Response.json({ error: "Заявка отменена" }, { status: 400 });
  }

  const paid = await saveOrder({
    ...order,
    status: "paid",
    paidAt: order.paidAt || new Date().toISOString(),
    downloadToken: order.downloadToken || createId(),
  });

  return Response.json({
    ok: true,
    orderId: paid.id,
    downloadToken: paid.downloadToken,
  });
}
