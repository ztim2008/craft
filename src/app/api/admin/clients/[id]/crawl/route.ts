import { after } from "next/server";
import { CRAWL_LIMITS } from "@/modules/crawler/types";
import { getClient, saveClient } from "@/modules/clients/store";
import { createImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";
import { assertPublicHttpUrl, UrlGuardError } from "@/modules/security/urlGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const client = await getClient(id);
  if (!client) return Response.json({ error: "Клиент не найден" }, { status: 404 });
  let body: { homepageOnly?: boolean; maxPages?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  let sourceUrl: string;
  try {
    sourceUrl = (await assertPublicHttpUrl(client.sourceUrl)).toString();
  } catch (error) {
    const message = error instanceof UrlGuardError ? error.message : "Некорректный URL источника";
    return Response.json({ error: message }, { status: 400 });
  }
  const homepageOnly =
    body.homepageOnly !== undefined ? Boolean(body.homepageOnly) : client.plan !== "pro";
  const maxPages = Math.min(
    Math.max(Number(body.maxPages) || (homepageOnly ? 1 : CRAWL_LIMITS.maxDefaultPages), 1),
    CRAWL_LIMITS.maxPages,
  );
  const job = await createImportJob({
    sourceUrl,
    homepageOnly,
    maxPages,
    ownerConfirmed: true,
  });
  await saveClient({ ...client, jobId: job.id, sourceUrl });
  after(async () => {
    await runImportJob(job.id);
  });
  return Response.json({ ok: true, jobId: job.id, status: job.status }, { status: 202 });
}
