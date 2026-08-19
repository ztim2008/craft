import { listImportJobs } from "@/modules/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await listImportJobs();
  return Response.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      sourceUrl: job.sourceUrl,
      status: job.status,
      createdAt: job.createdAt,
      pagesProcessed: job.pagesProcessed,
      assetsDownloaded: job.assetsDownloaded ?? 0,
      previewUrl: job.previewUrl,
      pageModelCounts: job.pageModelCounts,
    })),
  });
}
