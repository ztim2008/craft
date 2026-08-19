import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { emptyContent, type ContentOverlay } from "./types";

export function contentPath(jobId: string): string {
  return path.join(projectDir(jobId), "content.json");
}

export async function getContent(jobId: string): Promise<ContentOverlay> {
  try {
    const raw = await readFile(contentPath(jobId), "utf8");
    const parsed = JSON.parse(raw) as ContentOverlay;
    return {
      version: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      publishedAt: parsed.publishedAt,
      fields: parsed.fields || {},
      forms: parsed.forms || {},
      htmlBlocks: parsed.htmlBlocks || [],
    };
  } catch {
    return emptyContent();
  }
}

export async function saveContent(jobId: string, overlay: ContentOverlay): Promise<ContentOverlay> {
  const next: ContentOverlay = {
    version: 1,
    updatedAt: new Date().toISOString(),
    publishedAt: overlay.publishedAt,
    fields: overlay.fields || {},
    forms: overlay.forms || {},
    htmlBlocks: overlay.htmlBlocks || [],
  };
  await mkdir(projectDir(jobId), { recursive: true });
  await writeFile(contentPath(jobId), JSON.stringify(next, null, 2), "utf8");
  return next;
}
