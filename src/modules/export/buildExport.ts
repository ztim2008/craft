import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, projectDir } from "@/lib/storage";
import { getContent } from "@/modules/content/store";
import { applyContent } from "@/modules/content/applyContent";
import { pagePathFromRel } from "@/modules/content/applySeo";
import { injectFormBridge } from "@/modules/forms/formBridge";
import { rewriteForExport, htmlPathToLoc, sitemapXml } from "./rewriteForExport";
import type { HostingKind } from "@/modules/clients/types";
import { deployInstructionTxt } from "./deployReadme";

export type ExportPackageOptions = {
  clientName?: string;
  domain?: string;
  plan?: string;
  adminPassword?: string;
  nodePort?: number;
  hosting?: HostingKind;
  includeEditor?: boolean;
};

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

export async function buildExportZip(
  jobId: string,
  sourceUrl: string,
  siteOrigin = "https://YOUR-DOMAIN.RU",
  options: ExportPackageOptions = {},
): Promise<string> {
  const root = projectDir(jobId);
  const siteRoot = path.join(root, "site");
  const staging = path.join(root, ".export-staging");
  const zipPath = path.join(root, "export.zip");
  const origin = siteOrigin.replace(/\/+$/, "") || "https://YOUR-DOMAIN.RU";

  await rm(staging, { recursive: true, force: true });
  await mkdir(path.join(staging, "public"), { recursive: true });
  await mkdir(path.join(staging, "data", "source"), { recursive: true });
  await cp(siteRoot, path.join(staging, "public"), { recursive: true });

  const overlay = await getContent(jobId);
  let similar;
  try {
    const model = JSON.parse(await readFile(path.join(root, "page-model.json"), "utf8"));
    similar = model.similar;
  } catch {
    similar = undefined;
  }
  const publicRoot = path.join(staging, "public");
  const htmlFiles = await walkFiles(publicRoot, new Set([".html"]));
  for (const file of htmlFiles) {
    let html = await readFile(file, "utf8");
    html = rewriteForExport(html, jobId, origin, sourceUrl);
    html = injectFormBridge(html, "/api/form");
    const rel = path.relative(publicRoot, file);
    const sourceFile = path.join(staging, "data", "source", rel);
    await mkdir(path.dirname(sourceFile), { recursive: true });
    await writeFile(sourceFile, html, "utf8");
    html = applyContent(html, overlay, pagePathFromRel(rel), similar);
    await writeFile(file, html, "utf8");
  }
  const textFiles = await walkFiles(publicRoot, new Set([".css", ".js", ".xml", ".txt"]));
  for (const file of textFiles) {
    const raw = await readFile(file, "utf8");
    const next = rewriteForExport(raw, jobId, origin, sourceUrl);
    if (next !== raw) await writeFile(file, next, "utf8");
  }

  const sitemapFile = path.join(staging, "public", "sitemap.xml");
  const locs = htmlFiles.map((file) => htmlPathToLoc(publicRoot, file));
  await writeFile(sitemapFile, sitemapXml(origin, locs.length ? locs : ["/"]), "utf8");
  await writeFile(
    path.join(staging, "public", "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
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
  await cp(path.join(PORTABLE_DIR, "canvas.js"), path.join(staging, "canvas.js"));
  const port = options.nodePort && options.nodePort > 0 ? options.nodePort : 3000;
  const password = options.adminPassword?.trim() || "смените-пароль";
  const instruction = deployInstructionTxt({
    siteOrigin: origin,
    clientName: options.clientName,
    domain: options.domain,
    plan: options.plan,
    adminPassword: password,
    nodePort: port,
    hosting: options.hosting,
    includeEditor: options.includeEditor,
    sourceUrl,
  });
  await writeFile(path.join(staging, "INSTRUKTSIYA.txt"), instruction, "utf8");
  await writeFile(
    path.join(staging, ".env.example"),
    `PORT=${port}\nSITE_ORIGIN=${origin}\nADMIN_PASSWORD=${password}\n# Source: ${sourceUrl}\n`,
    "utf8",
  );

  await rm(zipPath, { force: true });
  await runZip(staging, zipPath);
  await rm(staging, { recursive: true, force: true });
  return zipPath;
}
