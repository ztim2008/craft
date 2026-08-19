import { getImportJob } from "@/modules/jobs/store";
import { listOrdersForJob } from "@/modules/billing/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const job = await getImportJob(id);
  if (!job) return Response.json({ error: "Задача не найдена" }, { status: 404 });
  const orders = await listOrdersForJob(id);
  const latest = orders[0];
  return Response.json({
    id: job.id,
    sourceUrl: job.sourceUrl,
    status: job.status,
    error: job.error,
    previewUrl: job.previewUrl,
    pagesProcessed: job.pagesProcessed,
    homepageOnly: job.homepageOnly,
    pageModelCounts: job.pageModelCounts,
    order: latest
      ? {
          id: latest.id,
          plan: latest.plan,
          status: latest.status,
          amountRub: latest.amountRub,
          downloadToken: latest.status === "paid" ? latest.downloadToken : undefined,
        }
      : null,
  });
}
