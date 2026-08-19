import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import type { PageSnapshot } from "@/modules/crawler/types";
import { analyzeHtml } from "./analyzeHtml";
import { applySectionScope } from "./sectionScope";
import { applySimilarWidgets } from "./similarWidgets";
import type { PageModel } from "./types";

export function pageModelPath(jobId: string): string {
  return path.join(projectDir(jobId), "page-model.json");
}

export async function buildPageModel(input: {
  jobId: string;
  sourceUrl: string;
  pages: PageSnapshot[];
}): Promise<PageModel> {
  const pages = [];
  for (const page of input.pages) {
    const html = await readFile(page.htmlFile, "utf8");
    pages.push({
      path: page.path,
      url: page.finalUrl || page.url,
      title: page.title || page.path,
      sections: analyzeHtml(html),
    });
  }
  applySectionScope(pages);
  const similar = applySimilarWidgets(pages);
  const model: PageModel = {
    version: 1,
    sourceUrl: input.sourceUrl,
    generatedAt: new Date().toISOString(),
    pages,
    similar,
    counts: {
      pages: pages.length,
      sections: pages.reduce((sum, item) => sum + item.sections.length, 0),
      fields: pages.reduce(
        (sum, item) =>
          sum + item.sections.reduce((inner, section) => inner + section.fields.length, 0),
        0,
      ),
      forms: pages.reduce(
        (sum, item) =>
          sum + item.sections.reduce((inner, section) => inner + section.forms.length, 0),
        0,
      ),
    },
  };
  await mkdir(projectDir(input.jobId), { recursive: true });
  await writeFile(pageModelPath(input.jobId), JSON.stringify(model, null, 2), "utf8");
  return model;
}

export async function getPageModel(jobId: string): Promise<PageModel | null> {
  try {
    const raw = await readFile(pageModelPath(jobId), "utf8");
    return JSON.parse(raw) as PageModel;
  } catch {
    return null;
  }
}
