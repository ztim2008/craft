import { readFile } from "node:fs/promises";
import { getImportJob } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const job = await getImportJob(id);
  const pageIndex = Number(new URL(request.url).searchParams.get("page") ?? "0");
  const page = job?.pages[pageIndex];
  if (!page) return new Response("Not found", { status: 404 });
  const body = await readFile(page.screenshotFile);
  return new Response(body, {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=60",
    },
  });
}
