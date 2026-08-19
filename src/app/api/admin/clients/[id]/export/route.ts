import { readFile } from "node:fs/promises";
import { ensureAdminPassword, getClient } from "@/modules/clients/store";
import { originFromDomain } from "@/modules/clients/types";
import { getImportJob } from "@/modules/jobs/store";
import { buildExportZip } from "@/modules/export/buildExport";
import { validateJobPackage } from "@/modules/export/validatePackage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const found = await getClient(id);
  if (!found) return Response.json({ error: "Клиент не найден" }, { status: 404 });
  if (!found.jobId) {
    return Response.json({ error: "Сначала привяжите импорт к клиенту" }, { status: 400 });
  }
  const job = await getImportJob(found.jobId);
  if (!job?.pages.length) {
    return Response.json({ error: "Нужен успешный импорт" }, { status: 400 });
  }
  const report = await validateJobPackage(found.jobId, originFromDomain(found.domain));
  if (!report.ok) {
    return Response.json(
      {
        error: "Валидатор красный — архив не отдаём",
        report,
      },
      { status: 409 },
    );
  }
  const client = await ensureAdminPassword(found);
  const zipPath = await buildExportZip(
    found.jobId,
    client.sourceUrl || job.sourceUrl,
    originFromDomain(client.domain),
    {
      clientName: client.name,
      domain: client.domain,
      plan: client.plan,
      adminPassword: client.adminPassword,
      nodePort: client.nodePort || 3000,
      hosting: client.hosting || "vps",
      includeEditor: client.includeEditor !== false,
    },
  );
  const body = await readFile(zipPath);
  const safe = client.domain.replace(/[^a-z0-9.-]/gi, "") || "site";
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="craft-${safe}.zip"`,
    },
  });
}
