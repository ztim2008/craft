import { getImportJob } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Некорректный id" }, { status: 400 });
  }
  const job = await getImportJob(id);
  if (!job) {
    return Response.json({ error: "Задача не найдена" }, { status: 404 });
  }
  return Response.json({
    id: job.id,
    sourceUrl: job.sourceUrl,
    homepageOnly: job.homepageOnly,
    maxPages: job.maxPages,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error,
    pagesFound: job.pagesFound,
    pagesProcessed: job.pagesProcessed,
    assetsFound: job.assetsFound,
    networkHits: job.networkHits ?? 0,
    assetsDownloaded: job.assetsDownloaded ?? 0,
    assetsFailed: job.assetsFailed ?? 0,
    previewUrl: job.previewUrl,
    warnings: job.warnings,
    errors: job.errors,
    discoveredLinks: job.discoveredLinks,
    pages: job.pages.map((page, index) => ({
      index,
      url: page.url,
      finalUrl: page.finalUrl,
      path: page.path,
      title: page.title,
      status: page.status,
      generator: page.generator,
      websiteId: page.websiteId,
      pageId: page.pageId,
      links: page.links.length,
      network: page.network.length,
      consoleErrors: page.consoleErrors.length,
      screenshotUrl: `/api/import/${job.id}/screenshot?page=${index}`,
      htmlUrl: `/api/import/${job.id}/html?page=${index}`,
      previewUrl: page.previewPath || job.previewUrl,
    })),
  });
}
