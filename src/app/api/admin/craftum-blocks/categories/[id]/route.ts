import {
  parseCategoryInput,
  removeCraftumBlockCategory,
  updateCraftumBlockCategory,
} from "@/modules/craftum-blocks/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  try {
    const category = parseCategoryInput(body);
    const file = updateCraftumBlockCategory(id, category);
    return Response.json({ ok: true, category, categories: file.categories });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сохранения";
    const status = message === "Категория не найдена" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  let reassignTo = "custom";
  try {
    const url = new URL(request.url);
    reassignTo = url.searchParams.get("reassignTo")?.trim() || "custom";
  } catch {
    /* ignore */
  }
  try {
    const file = removeCraftumBlockCategory(id, reassignTo);
    return Response.json({ ok: true, categories: file.categories });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка удаления";
    const status = message === "Категория не найдена" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
