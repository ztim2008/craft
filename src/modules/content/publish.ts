import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { getContent, saveContent } from "./store";
import { patchHtml } from "./patchHtml";

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
  const siteRoot = path.join(projectDir(jobId), "site");
  const files = await walkHtml(siteRoot);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    await writeFile(file, patchHtml(html, overlay.fields), "utf8");
  }
  await saveContent(jobId, {
    ...overlay,
    publishedAt: new Date().toISOString(),
  });
  return { files: files.length };
}
