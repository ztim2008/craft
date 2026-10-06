import { duplicateCraftumBlock, getAdminCraftumBlockCatalog } from "@/modules/craftum-blocks/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  let body: { newId?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as { newId?: string };
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  try {
    const { block } = duplicateCraftumBlock(id, body.newId?.trim().toLowerCase());
    return Response.json({ ok: true, block, catalog: getAdminCraftumBlockCatalog() }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка дублирования";
    const status = message === "Блок не найден" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
