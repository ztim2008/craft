export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

/** Проверка ключа публикации — только админ видит «↑ В каталог» в расширении. */
export async function GET(request: Request) {
  if (!checkPublishKey(request)) {
    return Response.json({ admin: false }, { status: 401, headers: CORS });
  }
  return Response.json({ admin: true }, { headers: CORS });
}
