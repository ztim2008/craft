import { collectAndFinish } from "@/modules/jobs/runner";
import { getImportJob } from "@/modules/jobs/store";

async function main() {
  const job = await getImportJob("e56926cc-f939-4358-a0dc-a0bcedc8b9a1");
  if (!job?.pages.length) throw new Error("job missing");
  await collectAndFinish(job.id, job.sourceUrl, job.pages, job.warnings || []);
  const done = await getImportJob(job.id);
  console.log("STATUS", done?.status, "assets", done?.assetsDownloaded, "failed", done?.assetsFailed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
