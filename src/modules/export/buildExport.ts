import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import { getContent } from "@/modules/content/store";
import { applyContent } from "@/modules/content/applyContent";
import { injectFormBridge } from "@/modules/forms/formBridge";
import { rewriteForExport, htmlPathToLoc, sitemapXml } from "./rewriteForExport";

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

function serverScript(): string {
  return `#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, "public");
const DATA = path.join(__dirname, "data");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, type) {
  res.writeHead(status, { "content-type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

function readContent() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, "content.json"), "utf8"));
  } catch {
    return { forms: {} };
  }
}

function resolveEmail(content, formId) {
  const direct = content.forms && content.forms[formId] && content.forms[formId].email;
  if (direct) return String(direct).trim();
  const all = Object.values(content.forms || {}).map((f) => f && f.email).find(Boolean);
  return all ? String(all).trim() : "";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "POST" && url.pathname === "/api/form") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = JSON.parse(raw || "{}"); } catch { return send(res, 400, JSON.stringify({ error: "JSON" }), "application/json"); }
    const fields = body.fields || {};
    const filled = Object.values(fields).some((v) => String(v || "").trim());
    if (!filled) return send(res, 400, JSON.stringify({ error: "Заполните поля формы" }), "application/json");
    const to = resolveEmail(readContent(), body.formId || "");
    if (!to) return send(res, 400, JSON.stringify({ error: "В data/content.json не указан email формы" }), "application/json");
    const lead = { id: randomUUID(), at: new Date().toISOString(), formId: body.formId || "", page: body.page || "/", fields, to, emailed: false };
    fs.mkdirSync(DATA, { recursive: true });
    fs.appendFileSync(path.join(DATA, "leads.jsonl"), JSON.stringify(lead) + "\\n");
    send(res, 200, JSON.stringify({ ok: true, emailed: false, message: "Заявка сохранена в data/leads.jsonl" }), "application/json");
    return;
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (url.pathname === "/") file = path.join(ROOT, "index.html");
  const rel = path.resolve(file);
  if (!rel.startsWith(path.resolve(ROOT))) return send(res, 403, "Forbidden");
  fs.stat(rel, (err, st) => {
    if (err) return send(res, 404, "Not found");
    const target = st.isDirectory() ? path.join(rel, "index.html") : rel;
    fs.readFile(target, (e2, buf) => {
      if (e2) return send(res, 404, "Not found");
      const ext = path.extname(target).toLowerCase();
      send(res, 200, buf, MIME[ext] || "application/octet-stream");
    });
  });
});

server.listen(PORT, () => console.log("Site http://127.0.0.1:" + PORT));
`;
}

function readme(): string {
  return `# Пакет сайта (Craft export)

Что внутри:

- \`public/\` — HTML, CSS, картинки, sitemap.xml, robots.txt
- \`data/content.json\` — правки текстов и email форм
- \`data/page-model.json\` — карта секций (для будущей админки на хостинге)
- \`server.mjs\` — раздача сайта + приём заявок \`POST /api/form\`

## Beget / Timeweb / VPS

Нужен Node.js 18+.

\`\`\`bash
cd эта_папка
node server.mjs
\`\`\`

По умолчанию порт 3000. Через nginx проксируйте домен на \`127.0.0.1:3000\`.

\`\`\`
PORT=3000 node server.mjs
\`\`\`

## Формы

В \`data/content.json\` у формы должен быть email:

\`\`\`json
"forms": {
  "n-...": { "email": "owner@domain.ru" }
}
\`\`\`

Заявки пишутся в \`data/leads.jsonl\`. Письма на SMTP подключаются отдельно (на Craft-сервере уже есть, на вашем хостинге — по желанию).

## Свой домен

В \`public/sitemap.xml\` и \`robots.txt\` замените \`YOUR-DOMAIN.RU\` на ваш домен.
В HTML canonical тоже: \`YOUR-DOMAIN.RU\`.

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
  await mkdir(path.join(staging, "data"), { recursive: true });
  await cp(siteRoot, path.join(staging, "public"), { recursive: true });

  const overlay = await getContent(jobId);
  const publicRoot = path.join(staging, "public");
  const htmlFiles = await walkFiles(publicRoot, new Set([".html"]));
  for (const file of htmlFiles) {
    let html = await readFile(file, "utf8");
    html = applyContent(html, overlay);
    html = rewriteForExport(html, jobId, siteOrigin);
    html = injectFormBridge(html, "/api/form");
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
  await writeFile(path.join(staging, "server.mjs"), serverScript(), "utf8");
  await writeFile(path.join(staging, "README-deploy.md"), readme(), "utf8");
  await writeFile(
    path.join(staging, ".env.example"),
    `PORT=3000\nSITE_ORIGIN=${siteOrigin}\n# Source: ${sourceUrl}\n`,
    "utf8",
  );

  await rm(zipPath, { force: true });
  await runZip(staging, zipPath);
  await rm(staging, { recursive: true, force: true });
  return zipPath;
}
