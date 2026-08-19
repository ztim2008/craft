import { ensureAdminPassword, getClient } from "@/modules/clients/store";
import { originFromDomain } from "@/modules/clients/types";
import { deployInstructionTxt } from "@/modules/export/deployReadme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const found = await getClient(id);
  if (!found) return Response.json({ error: "Клиент не найден" }, { status: 404 });
  const client = await ensureAdminPassword(found);
  const text = deployInstructionTxt({
    siteOrigin: originFromDomain(client.domain),
    clientName: client.name,
    domain: client.domain,
    plan: client.plan,
    adminPassword: client.adminPassword,
    nodePort: client.nodePort || 3000,
    hosting: client.hosting || "vps",
    includeEditor: client.includeEditor !== false,
    sourceUrl: client.sourceUrl,
  });
  const safe = client.domain.replace(/[^a-z0-9.-]/gi, "") || "site";
  return new Response(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="instrukciya-${safe}.txt"`,
    },
  });
}
