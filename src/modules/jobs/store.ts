import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createId } from "@/lib/ids";
import { JOBS_ROOT, jobJsonPath } from "@/lib/storage";
import type { ImportJob } from "@/modules/crawler/types";

export async function createImportJob(input: {
  sourceUrl: string;
  homepageOnly: boolean;
  maxPages: number;
  ownerConfirmed: boolean;
}): Promise<ImportJob> {
  const job: ImportJob = {
    id: createId(),
    sourceUrl: input.sourceUrl,
    homepageOnly: input.homepageOnly,
    maxPages: input.maxPages,
    ownerConfirmed: input.ownerConfirmed,
    status: "queued",
    createdAt: new Date().toISOString(),
    pagesFound: 0,
    pagesProcessed: 0,
    assetsFound: 0,
    networkHits: 0,
    assetsDownloaded: 0,
    assetsFailed: 0,
    pageModelCounts: { pages: 0, sections: 0, fields: 0, forms: 0 },
    warnings: [],
    errors: [],
    discoveredLinks: [],
    pages: [],
  };
  await saveImportJob(job);
  return job;
}

export async function saveImportJob(job: ImportJob): Promise<void> {
  await mkdir(JOBS_ROOT, { recursive: true });
  await writeFile(jobJsonPath(job.id), JSON.stringify(job, null, 2), "utf8");
}

export async function getImportJob(id: string): Promise<ImportJob | null> {
  try {
    const raw = await readFile(jobJsonPath(id), "utf8");
    return JSON.parse(raw) as ImportJob;
  } catch {
    return null;
  }
}

export async function patchImportJob(
  id: string,
  patch: Partial<ImportJob>,
): Promise<ImportJob | null> {
  const current = await getImportJob(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await saveImportJob(next);
  return next;
}

export async function listImportJobs(): Promise<ImportJob[]> {
  try {
    const files = await readdir(JOBS_ROOT);
    const jobs: ImportJob[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(jobJsonPath(file.replace(/\.json$/, "")), "utf8");
        jobs.push(JSON.parse(raw) as ImportJob);
      } catch {
        // skip broken
      }
    }
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}
