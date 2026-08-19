import { getContent, saveContent } from "@/modules/content/store";
import type { ContentOverlay } from "@/modules/content/types";
import { publishContent } from "@/modules/content/publish";
import { getImportJob } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  if (!(await getImportJob(id))) {
    return Response.json({ error: "Задача не найдена" }, { status: 404 });
  }
  return Response.json(await getContent(id));
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  if (!(await getImportJob(id))) {
    return Response.json({ error: "Задача не найдена" }, { status: 404 });
  }
  let body: Partial<ContentOverlay>;
  try {
    body = (await request.json()) as Partial<ContentOverlay>;
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  const current = await getContent(id);
  const saved = await saveContent(id, {
    version: 1,
    updatedAt: new Date().toISOString(),
    publishedAt: current.publishedAt,
    fields: body.fields || {},
    forms: body.forms || {},
  });
  return Response.json(saved);
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  if (!(await getImportJob(id))) {
    return Response.json({ error: "Задача не найдена" }, { status: 404 });
  }
  const result = await publishContent(id);
  const overlay = await getContent(id);
  return Response.json({ ok: true, ...result, publishedAt: overlay.publishedAt });
}
