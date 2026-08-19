import { listLeads } from "@/modules/forms/leads";
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
  return Response.json({ leads: await listLeads(id) });
}
