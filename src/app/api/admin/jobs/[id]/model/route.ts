import { getImportJob, patchImportJob } from "@/modules/jobs/store";
import { buildPageModel, getPageModel } from "@/modules/pageModel/buildPageModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const model = await getPageModel(id);
  if (!model) {
    return Response.json({ error: "Page Model ещё не собран" }, { status: 404 });
  }
  return Response.json(model);
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const job = await getImportJob(id);
  if (!job) return Response.json({ error: "Задача не найдена" }, { status: 404 });
  if (!job.pages.length) {
    return Response.json({ error: "Нет сохранённых страниц" }, { status: 400 });
  }
  const model = await buildPageModel({
    jobId: id,
    sourceUrl: job.sourceUrl,
    pages: job.pages,
  });
  await patchImportJob(id, { pageModelCounts: model.counts });
  return Response.json(model);
}
