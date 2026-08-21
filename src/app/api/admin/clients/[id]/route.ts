import { getClient, saveClient } from "@/modules/clients/store";
import { normalizeHosting, normalizeOwnDomain, normalizePort } from "@/modules/clients/types";
import type { PlanId } from "@/modules/billing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const client = await getClient(id);
  if (!client) return Response.json({ error: "Клиент не найден" }, { status: 404 });
  return Response.json({ client });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await getClient(id);
  if (!current) return Response.json({ error: "Клиент не найден" }, { status: 404 });
  let body: Partial<{
    name: string;
    domain: string;
    plan: PlanId;
    sourceUrl: string;
    jobId: string;
    email: string;
    phone: string;
    notes: string;
    adminPassword: string;
    nodePort: number | string;
    hosting: string;
    includeEditor: boolean;
  }>;
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON" }, { status: 400 });
  }
  try {
    const next = await saveClient({
      ...current,
      name: body.name !== undefined ? body.name.trim() : current.name,
      domain: body.domain !== undefined ? normalizeOwnDomain(body.domain) : current.domain,
      plan: body.plan === "pro" || body.plan === "basic" ? body.plan : current.plan,
      sourceUrl: body.sourceUrl !== undefined ? body.sourceUrl.trim() : current.sourceUrl,
      jobId: body.jobId !== undefined ? body.jobId || undefined : current.jobId,
      email: body.email !== undefined ? body.email.trim() || undefined : current.email,
      phone: body.phone !== undefined ? body.phone.trim() || undefined : current.phone,
      notes: body.notes !== undefined ? body.notes.trim() || undefined : current.notes,
      adminPassword:
        body.adminPassword !== undefined ? body.adminPassword.trim() || undefined : current.adminPassword,
      nodePort: body.nodePort !== undefined ? normalizePort(body.nodePort) : current.nodePort || 3000,
      hosting: body.hosting !== undefined ? normalizeHosting(body.hosting) : current.hosting || "vps",
      includeEditor: body.includeEditor !== undefined ? Boolean(body.includeEditor) : current.includeEditor !== false,
    });
    return Response.json({ ok: true, client: next });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Не сохранилось" },
      { status: 400 },
    );
  }
}
