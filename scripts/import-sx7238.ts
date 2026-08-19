import { createImportJob, getImportJob } from "@/modules/jobs/store";
import { runImportJob } from "@/modules/jobs/runner";

async function main() {
  const job = await createImportJob({
    sourceUrl: "https://sx7238.craftum.io/",
    homepageOnly: false,
    maxPages: 50,
    ownerConfirmed: true,
  });
  console.log("JOB", job.id);
  await runImportJob(job.id);
  const done = await getImportJob(job.id);
  console.log(
    "STATUS",
    done?.status,
    "pages",
    done?.pagesProcessed,
    "assets",
    done?.assetsDownloaded,
    "forms",
    done?.pageModelCounts?.forms,
    "error",
    done?.error,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
