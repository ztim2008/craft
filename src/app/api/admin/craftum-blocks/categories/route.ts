import {
  addCraftumBlockCategory,
  getCraftumBlockCategories,
  parseCategoryInput,
} from "@/modules/craftum-blocks/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ categories: getCraftumBlockCategories() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }
  try {
    const category = parseCategoryInput(body);
    const file = addCraftumBlockCategory(category);
    return Response.json({ ok: true, category, categories: file.categories }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сохранения";
    return Response.json({ error: message }, { status: 400 });
  }
}
