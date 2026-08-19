import { after } from "next/server";
import { getImportJob } from "@/modules/jobs/store";
import { collectAndFinish } from "@/modules/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const job = await getImportJob(id);
  if (!job) return Response.json({ error: "Задача не найдена" }, { status: 404 });
  if (!job.pages.length) {
    return Response.json({ error: "Сначала нужен crawl страниц" }, { status: 400 });
  }

  after(async () => {
    await collectAndFinish(id, job.sourceUrl, job.pages, job.warnings);
  });

  return Response.json({ jobId: id, status: "collecting" }, { status: 202 });
}
