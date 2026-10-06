import {
  addCraftumBlock,
  getAdminCraftumBlockCatalog,
  parseCraftumBlockInput,
} from "@/modules/craftum-blocks/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getAdminCraftumBlockCatalog());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  try {
    const block = parseCraftumBlockInput(body);
    addCraftumBlock(block);
    return Response.json(
      { ok: true, block, catalog: getAdminCraftumBlockCatalog() },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сохранения";
    return Response.json({ error: message }, { status: 400 });
  }
}
