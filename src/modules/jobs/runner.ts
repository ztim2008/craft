import { mkdir } from "node:fs/promises";
import { projectDir } from "@/lib/storage";
import { collectProjectAssets } from "@/modules/assets/collectProject";
import { launchCrawlerBrowser } from "@/modules/crawler/browser";
import { crawlSite } from "@/modules/crawler/crawlSite";
import { buildPageModel } from "@/modules/pageModel/buildPageModel";
import { getImportJob, patchImportJob } from "./store";

const running = new Set<string>();

export async function runImportJob(jobId: string): Promise<void> {
  if (running.has(jobId)) return;
  running.add(jobId);

  try {
    await patchImportJob(jobId, {
      status: "crawling",
      startedAt: new Date().toISOString(),
    });
    const job = await getImportJob(jobId);
    if (!job) throw new Error("Job not found");

    const root = projectDir(jobId);
    await mkdir(root, { recursive: true });
    const browser = await launchCrawlerBrowser();
    try {
      const result = await crawlSite(browser, job, root, async (patch) => {
        await patchImportJob(jobId, patch);
      });
      await patchImportJob(jobId, {
        ...result,
        networkHits: result.networkHits,
        status: "collecting",
      });

      if (result.pagesProcessed < 1) {
        await patchImportJob(jobId, {
          status: "failed",
          finishedAt: new Date().toISOString(),
          error: "Не удалось сохранить ни одной страницы",
        });
        return;
      }

      await collectAndFinish(jobId, job.sourceUrl, result.pages, result.warnings);
    } finally {
      await browser.close();
    }
  } catch (error) {
    await patchImportJob(jobId, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Неизвестная ошибка импорта",
      errors: [error instanceof Error ? error.message : "unknown"],
    });
  } finally {
    running.delete(jobId);
  }
}

export async function collectAndFinish(
  jobId: string,
  origin: string,
  pages: Awaited<ReturnType<typeof crawlSite>>["pages"],
  previousWarnings: string[],
): Promise<void> {
  const root = projectDir(jobId);
  await patchImportJob(jobId, { status: "collecting" });
  const assets = await collectProjectAssets({
    origin,
    pages,
    projectRoot: root,
  });
  const model = await buildPageModel({
    jobId,
    sourceUrl: origin,
    pages,
  });
  const networkHits = pages.reduce((sum, page) => sum + page.network.length, 0);
  await patchImportJob(jobId, {
    pages,
    status: "success",
    finishedAt: new Date().toISOString(),
    networkHits,
    assetsDownloaded: assets.downloaded,
    assetsFailed: assets.failed,
    assetsFound: assets.downloaded,
    previewUrl: `/preview/${jobId}/`,
    pageModelCounts: model.counts,
    warnings: [...previousWarnings, ...assets.warnings],
  });
}
