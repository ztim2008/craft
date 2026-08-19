import { after } from "next/server";
import { createId } from "@/lib/ids";
import { CRAWL_LIMITS } from "@/modules/crawler/types";
import { getOrder, saveOrder } from "@/modules/billing/orders";
import { getImportJob, patchImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  if (paid.plan === "pro") {
    const job = await getImportJob(paid.jobId);
    if (job?.homepageOnly) {
      await patchImportJob(paid.jobId, {
        homepageOnly: false,
        maxPages: CRAWL_LIMITS.maxPages,
        status: "queued",
      });
      after(async () => {
        await runImportJob(paid.jobId);
      });
    }
  }

  return Response.json({
    ok: true,
    orderId: paid.id,
    downloadToken: paid.downloadToken,
    demoUrl: `/demo/${paid.jobId}`,
  });
}
