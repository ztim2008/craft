import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { pageOutputPath } from "@/modules/assets/rewrite";
import { getImportJob } from "@/modules/jobs/store";
import { getPageModel } from "@/modules/pageModel/buildPageModel";
import { hasPreviewPathLeak, rewriteForExport } from "./rewriteForExport";

export type ValidateReport = {
  ok: boolean;
  jobId: string;
  checkedAt: string;
  errors: string[];
  warnings: string[];
};

const TEXT_EXTS = new Set([".html", ".css", ".js", ".xml", ".txt", ".svg"]);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(abs)));
    else out.push(abs);
  }
  return out;
}

export async function validateJobPackage(jobId: string, siteOrigin?: string): Promise<ValidateReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const job = await getImportJob(jobId);
  if (!job) {
    return {
      ok: false,
      jobId,
      checkedAt: new Date().toISOString(),
      errors: ["Импорт не найден"],
      warnings: [],
    };
  }
  if (job.status !== "success" || !job.pages?.length) {
    errors.push("Нет успешного импорта со страницами");
  }

  const origin = (siteOrigin || "https://example.ru").replace(/\/+$/, "");
  const root = projectDir(jobId);
  const siteRoot = path.join(root, "site");
  const model = await getPageModel(jobId);
  if (!model?.pages.length) {
    errors.push("Нет page-model.json");
  } else {
    for (const page of model.pages) {
      const file = path.join(siteRoot, pageOutputPath(page.path));
      try {
        await access(file);
      } catch {
        errors.push(`Нет HTML для ${page.path} (${pageOutputPath(page.path)})`);
      }
    }
  }

  const files = await walk(siteRoot);
  if (!files.length) errors.push("Папка site/ пустая");
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!TEXT_EXTS.has(ext)) continue;
    let text = "";
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }
    const exported = rewriteForExport(text, jobId, origin);
    if (hasPreviewPathLeak(exported)) {
      errors.push(`После экспорта останется /preview/… в ${path.relative(siteRoot, file)}`);
    }
  }

  if ((job.assetsFailed || 0) > 0) {
    warnings.push(`Не скачалось ассетов: ${job.assetsFailed}`);
  }
  const cssFiles = files.filter((file) => path.extname(file).toLowerCase() === ".css");
  if (!cssFiles.length) warnings.push("В копии нет CSS-файлов — проверьте стили глазами");

  return {
    ok: errors.length === 0,
    jobId,
    checkedAt: new Date().toISOString(),
    errors,
    warnings,
  };
}
