import { readFile } from "node:fs/promises";
import { findPaidOrder } from "@/modules/billing/orders";
import { buildExportZip } from "@/modules/export/buildExport";
import { getImportJob } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return Response.json({ error: "Нет токена скачивания" }, { status: 401 });
  const order = await findPaidOrder(id, token);
  if (!order) return Response.json({ error: "Оплата не подтверждена" }, { status: 403 });
  const job = await getImportJob(id);
  if (!job?.pages.length) {
    return Response.json({ error: "Сайт ещё собирается. Обновите страницу через минуту." }, { status: 409 });
  }
  const zipPath = await buildExportZip(id, job.sourceUrl);
  const body = await readFile(zipPath);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="craft-${order.plan}-${id.slice(0, 8)}.zip"`,
    },
  });
}
