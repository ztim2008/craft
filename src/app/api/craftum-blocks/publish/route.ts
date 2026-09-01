import {
  getCraftumBlockById,
  parsePublishPayload,
  upsertCraftumBlock,
} from "@/modules/craftum-blocks/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Craftum-Blocks-Key",
};

function checkPublishKey(request: Request): boolean {
  const expected = (process.env.CRAFTUM_BLOCKS_PUBLISH_KEY || "").trim();
  if (!expected) return false;
  const key = request.headers.get("x-craftum-blocks-key")?.trim();
  return key === expected;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  if (!checkPublishKey(request)) {
    return Response.json(
      { error: "Нужен ключ X-Craftum-Blocks-Key (задайте CRAFTUM_BLOCKS_PUBLISH_KEY в .env)" },
      { status: 401, headers: CORS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400, headers: CORS });
  }

  try {
    const block = parsePublishPayload(body);
    const existed = !!getCraftumBlockById(block.id);
    const catalog = upsertCraftumBlock(block);
    return Response.json(
      { ok: true, block, catalog, updated: existed },
      { status: existed ? 200 : 201, headers: CORS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка публикации";
    return Response.json({ error: message }, { status: 400, headers: CORS });
  }
}
