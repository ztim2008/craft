import { createClient, listClients } from "@/modules/clients/store";
import type { PlanId } from "@/modules/billing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await listClients();
  return Response.json({ clients });
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    domain?: string;
    plan?: PlanId;
    sourceUrl?: string;
    jobId?: string;
    email?: string;
    phone?: string;
    notes?: string;
    orderId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON" }, { status: 400 });
  }
  const plan = body.plan === "pro" ? "pro" : "basic";
  try {
    const client = await createClient({
      name: body.name || "",
      domain: body.domain || "",
      plan,
      sourceUrl: body.sourceUrl || "",
      jobId: body.jobId,
      email: body.email,
      phone: body.phone,
      notes: body.notes,
      orderId: body.orderId,
    });
    return Response.json({ ok: true, client });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Не удалось создать" },
      { status: 400 },
    );
  }
}
