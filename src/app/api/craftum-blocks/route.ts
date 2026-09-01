import { getPublicCraftumBlockCatalog } from "@/modules/craftum-blocks/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const catalog = getPublicCraftumBlockCatalog();
    return Response.json(catalog, { headers: CORS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "catalog error";
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
}
