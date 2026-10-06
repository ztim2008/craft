import { incrementBlockInsertCount } from "@/modules/craftum-blocks/insert-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400, headers: CORS });
  }

  const blockId = String((body as { blockId?: string })?.blockId || "")
    .trim()
    .toLowerCase();
  if (!blockId) {
    return Response.json({ error: "Укажите blockId" }, { status: 400, headers: CORS });
  }

  try {
    const stats = incrementBlockInsertCount(blockId);
    return Response.json({ ok: true, blockId, stats }, { headers: CORS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return Response.json({ error: message }, { status: 400, headers: CORS });
  }
}
