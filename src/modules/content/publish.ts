import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { getContent, saveContent } from "./store";
import { applyContent } from "./applyContent";
import { pagePathFromRel } from "./applySeo";
import { getPageModel } from "@/modules/pageModel/buildPageModel";

async function walkHtml(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets") continue;
      out.push(...(await walkHtml(abs)));
    } else if (entry.name.endsWith(".html")) {
      out.push(abs);
    }
  }
  return out;
}

export async function publishContent(jobId: string): Promise<{ files: number }> {
  const overlay = await getContent(jobId);
  const model = await getPageModel(jobId);
  const similar = model?.similar;
  const siteRoot = path.join(projectDir(jobId), "site");
  const files = await walkHtml(siteRoot);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const rel = path.relative(siteRoot, file);
    await writeFile(file, applyContent(html, overlay, pagePathFromRel(rel), similar), "utf8");
  }
  await saveContent(jobId, {
    ...overlay,
    publishedAt: new Date().toISOString(),
  });
  return { files: files.length };
}
