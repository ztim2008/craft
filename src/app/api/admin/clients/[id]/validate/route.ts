import { getClient } from "@/modules/clients/store";
import { originFromDomain } from "@/modules/clients/types";
import { validateJobPackage } from "@/modules/export/validatePackage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const client = await getClient(id);
  if (!client) return Response.json({ error: "Клиент не найден" }, { status: 404 });
  if (!client.jobId) {
    return Response.json({
      report: {
        ok: false,
        jobId: "",
        checkedAt: new Date().toISOString(),
        errors: ["Нет привязанного импорта"],
        warnings: [],
      },
    });
  }
  const report = await validateJobPackage(client.jobId, originFromDomain(client.domain));
  return Response.json({ report });
}
