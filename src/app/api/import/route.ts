import { after } from "next/server";
import { assertPublicHttpUrl, UrlGuardError } from "@/modules/security/urlGuard";
import { CRAWL_LIMITS } from "@/modules/crawler/types";
import { createImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ImportBody = {
  url?: string;
  homepageOnly?: boolean;
  maxPages?: number;
  ownerConfirmed?: boolean;
};

export async function POST(request: Request) {
  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  if (!body.ownerConfirmed) {
    return Response.json(
      {
        error:
          "Нужно подтвердить, что вы владеете сайтом или имеете право на импорт",
      },
      { status: 400 },
    );
  }

  if (!body.url || typeof body.url !== "string") {
    return Response.json({ error: "Укажите URL" }, { status: 400 });
  }

  let sourceUrl: string;
  try {
    sourceUrl = (await assertPublicHttpUrl(body.url)).toString();
  } catch (error) {
    const message =
      error instanceof UrlGuardError ? error.message : "Некорректный URL";
    return Response.json({ error: message }, { status: 400 });
  }

  const homepageOnly = Boolean(body.homepageOnly);
  const maxPages = Math.min(
    Math.max(Number(body.maxPages) || CRAWL_LIMITS.maxDefaultPages, 1),
    CRAWL_LIMITS.maxPages,
  );

  const job = await createImportJob({
    sourceUrl,
    homepageOnly,
    maxPages,
    ownerConfirmed: true,
  });

  after(async () => {
    await runImportJob(job.id);
  });

  return Response.json({ jobId: job.id, status: job.status }, { status: 202 });
}
