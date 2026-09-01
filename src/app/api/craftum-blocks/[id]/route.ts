import { getCraftumBlockById } from "@/modules/craftum-blocks/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

type Params = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const block = getCraftumBlockById(id);
    if (!block) {
      return Response.json({ error: "not found" }, { status: 404, headers: CORS });
    }
    return Response.json(block, { headers: CORS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "catalog error";
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
}
