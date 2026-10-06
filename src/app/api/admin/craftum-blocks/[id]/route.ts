import {
  getCraftumBlockById,
  getAdminCraftumBlockCatalog,
  parseCraftumBlockInput,
  removeCraftumBlock,
  updateCraftumBlock,
} from "@/modules/craftum-blocks/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const block = getCraftumBlockById(id);
  if (!block) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(block);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  try {
    const block = parseCraftumBlockInput(body);
    updateCraftumBlock(id, block);
    return Response.json({ ok: true, block: getCraftumBlockById(id), catalog: getAdminCraftumBlockCatalog() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сохранения";
    const status = message === "Блок не найден" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const catalog = removeCraftumBlock(id);
    return Response.json({ ok: true, catalog: getAdminCraftumBlockCatalog() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка удаления";
    const status = message === "Блок не найден" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
