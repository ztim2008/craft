import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PREVIEW_DIR } from "@/modules/craftum-blocks/preview-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;
  if (!/^[\w.-]+\.webp$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = join(PREVIEW_DIR, filename);
  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const body = readFileSync(filePath);
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
