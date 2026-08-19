import { readFile } from "node:fs/promises";
import { getImportJob } from "@/modules/jobs/store";
import { buildExportZip } from "@/modules/export/buildExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const job = await getImportJob(id);
  if (!job) return Response.json({ error: "Задача не найдена" }, { status: 404 });
  if (!job.pages.length) {
    return Response.json({ error: "Сначала нужен успешный импорт" }, { status: 400 });
  }
  const zipPath = await buildExportZip(id, job.sourceUrl);
  const body = await readFile(zipPath);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="craft-export-${id.slice(0, 8)}.zip"`,
    },
  });
}
