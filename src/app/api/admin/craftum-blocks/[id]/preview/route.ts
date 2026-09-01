import {
  getCraftumBlockById,
  updateCraftumBlock,
} from "@/modules/craftum-blocks/catalog";
import { processBlockPreviewImage, saveBlockPreviewWebp } from "@/modules/craftum-blocks/preview-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const block = getCraftumBlockById(id);
  if (!block) return Response.json({ error: "not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Нужен файл (file)" }, { status: 400 });
  }

  const raw = Buffer.from(await file.arrayBuffer());
  if (raw.length > MAX_INPUT_BYTES) {
    return Response.json({ error: "Максимум 12 МБ до оптимизации" }, { status: 400 });
  }

  let processed;
  try {
    processed = await processBlockPreviewImage(raw);
  } catch {
    return Response.json({ error: "Не удалось обработать изображение" }, { status: 400 });
  }

  const previewUrl = saveBlockPreviewWebp(id, processed.buffer);
  const updated = { ...block, previewUrl };
  const catalog = updateCraftumBlock(id, updated);

  return Response.json({
    ok: true,
    previewUrl,
    block: updated,
    catalog,
    meta: {
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
      format: "webp",
      aspect: "4:3",
    },
  });
}
