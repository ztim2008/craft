import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, projectDir } from "@/lib/storage";
import { getContent } from "@/modules/content/store";
import { applyContent } from "@/modules/content/applyContent";
import { injectFormBridge } from "@/modules/forms/formBridge";
import { rewriteForExport, htmlPathToLoc, sitemapXml } from "./rewriteForExport";

const PORTABLE_DIR = path.join(PROJECT_ROOT, "src/modules/export/portable");

function runZip(cwd: string, zipFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("zip", ["-r", "-q", zipFile, "."], { cwd });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`zip exited ${code}`));
    });
  });
}

async function walkFiles(dir: string, exts: Set<string>): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(abs, exts)));
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      out.push(abs);
    }
  }
  return out;
}

function readme(): string {
  return `# Пакет сайта (Craft export)

- \`public/\` — готовый сайт
- \`data/source/\` — HTML до правок (для повторной публикации)
- \`data/content.json\` — тексты, формы, HTML-блоки
- \`data/page-model.json\` — карта секций для редактора
- \`server.mjs\` — сайт + формы + редактор
- \`admin.html\` — редактор страниц

## Запуск

Нужен Node.js 18+.

\`\`\`bash
cp .env.example .env
# задайте ADMIN_PASSWORD
node server.mjs
\`\`\`

- Сайт: http://127.0.0.1:3000/
- Редактор: http://127.0.0.1:3000/admin

Проксируйте домен на этот порт (Beget / Timeweb / VPS).

В редакторе: правите тексты → Сохранить (черновик) → Опубликовать (запись в public/).

## Формы

У формы в редакторе укажите email. Заявки: \`data/leads.jsonl\`.

## Домен

В \`public/sitemap.xml\` замените \`YOUR-DOMAIN.RU\`.

Техподдержка в базовую поставку не входит.
`;
}

export async function buildExportZip(jobId: string, sourceUrl: string): Promise<string> {
  const root = projectDir(jobId);
  const siteRoot = path.join(root, "site");
  const staging = path.join(root, ".export-staging");
  const zipPath = path.join(root, "export.zip");
  const siteOrigin = "https://YOUR-DOMAIN.RU";

  await rm(staging, { recursive: true, force: true });
  await mkdir(path.join(staging, "public"), { recursive: true });
  await mkdir(path.join(staging, "data", "source"), { recursive: true });
  await cp(siteRoot, path.join(staging, "public"), { recursive: true });

  const overlay = await getContent(jobId);
  const publicRoot = path.join(staging, "public");
  const htmlFiles = await walkFiles(publicRoot, new Set([".html"]));
  for (const file of htmlFiles) {
    let html = await readFile(file, "utf8");
    html = rewriteForExport(html, jobId, siteOrigin);
    html = injectFormBridge(html, "/api/form");
    const rel = path.relative(publicRoot, file);
    const sourceFile = path.join(staging, "data", "source", rel);
    await mkdir(path.dirname(sourceFile), { recursive: true });
    await writeFile(sourceFile, html, "utf8");
    html = applyContent(html, overlay);
    await writeFile(file, html, "utf8");
  }
  const textFiles = await walkFiles(publicRoot, new Set([".css", ".js", ".xml", ".txt"]));
  for (const file of textFiles) {
    const raw = await readFile(file, "utf8");
    const next = rewriteForExport(raw, jobId, siteOrigin);
    if (next !== raw) await writeFile(file, next, "utf8");
  }

  const sitemapFile = path.join(staging, "public", "sitemap.xml");
  const locs = htmlFiles.map((file) => htmlPathToLoc(publicRoot, file));
  await writeFile(sitemapFile, sitemapXml(siteOrigin, locs.length ? locs : ["/"]), "utf8");
  await writeFile(
    path.join(staging, "public", "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`,
    "utf8",
  );

  await writeFile(path.join(staging, "data", "content.json"), JSON.stringify(overlay, null, 2), "utf8");
  try {
    const model = await readFile(path.join(root, "page-model.json"), "utf8");
    await writeFile(path.join(staging, "data", "page-model.json"), model, "utf8");
  } catch {
    // optional
  }
  await cp(path.join(PORTABLE_DIR, "server.mjs"), path.join(staging, "server.mjs"));
  await cp(path.join(PORTABLE_DIR, "patch.cjs"), path.join(staging, "patch.cjs"));
  await cp(path.join(PORTABLE_DIR, "admin.html"), path.join(staging, "admin.html"));
  await writeFile(path.join(staging, "README-deploy.md"), readme(), "utf8");
  await writeFile(
    path.join(staging, ".env.example"),
    `PORT=3000\nSITE_ORIGIN=${siteOrigin}\nADMIN_PASSWORD=смените-пароль\n# Source: ${sourceUrl}\n`,
    "utf8",
  );

  await rm(zipPath, { force: true });
  await runZip(staging, zipPath);
  await rm(staging, { recursive: true, force: true });
  return zipPath;
}
