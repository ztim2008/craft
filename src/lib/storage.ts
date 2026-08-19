import path from "node:path";

export const PROJECT_ROOT = process.cwd();
export const STORAGE_ROOT = path.join(
  /* turbopackIgnore: true */ PROJECT_ROOT,
  "storage",
);
export const JOBS_ROOT = path.join(STORAGE_ROOT, "jobs");
export const PROJECTS_ROOT = path.join(STORAGE_ROOT, "projects");

export function jobJsonPath(jobId: string): string {
  return path.join(JOBS_ROOT, `${jobId}.json`);
}

export function projectDir(jobId: string): string {
  return path.join(PROJECTS_ROOT, jobId);
}
