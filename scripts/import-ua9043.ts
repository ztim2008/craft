import { createImportJob, getImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";

async function main() {
  const job = await createImportJob({
    sourceUrl: "https://ua9043.craftum.io/",
    homepageOnly: false,
    maxPages: 12,
    ownerConfirmed: true,
  });
  console.log("JOB", job.id);
  await runImportJob(job.id);
  const done = await getImportJob(job.id);
  console.log(JSON.stringify({
    status: done?.status,
    pages: done?.pagesProcessed,
    assets: done?.assetsDownloaded,
    forms: done?.pageModelCounts?.forms,
    fields: done?.pageModelCounts?.fields,
    sections: done?.pageModelCounts?.sections,
    error: done?.error,
    preview: done ? `https://craft.nordic-builder.ru/preview/${done.id}/` : null,
    adminHint: done ? `https://craft.nordic-builder.ru/admin/jobs/${done.id}` : null,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
