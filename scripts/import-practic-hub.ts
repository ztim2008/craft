import { createClient } from "@/modules/clients/store";
import { createImportJob, getImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";

async function main() {
  const job = await createImportJob({
    sourceUrl: "https://practic-hub.ru/",
    homepageOnly: false,
    maxPages: 50,
    ownerConfirmed: true,
  });
  const client = await createClient({
    name: "Practic Hub",
    domain: "practic-hub.ru",
    plan: "pro",
    sourceUrl: "https://practic-hub.ru/",
    jobId: job.id,
    notes: "Полигон сложного Craftum: много страниц, не выкладка на боевой домен.",
    hosting: "vps",
    includeEditor: true,
  });
  console.log("CLIENT", client.id);
  console.log("JOB", job.id);
  await runImportJob(job.id);
  const done = await getImportJob(job.id);
  console.log(
    JSON.stringify(
      {
        status: done?.status,
        pagesProcessed: done?.pagesProcessed,
        pagesFound: done?.pagesFound,
        assetsDownloaded: done?.assetsDownloaded,
        forms: done?.pageModelCounts?.forms,
        sections: done?.pageModelCounts?.sections,
        fields: done?.pageModelCounts?.fields,
        warnings: done?.warnings,
        error: done?.error,
        preview: `https://craft.nordic-builder.ru/preview/${job.id}/`,
        adminClient: `https://craft.nordic-builder.ru/admin/clients/${client.id}`,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
