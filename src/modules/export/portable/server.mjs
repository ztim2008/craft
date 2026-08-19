#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applyContent } = require("./patch.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "public");
const DATA = path.join(__dirname, "data");
const SOURCE = path.join(DATA, "source");
const ADMIN_FILE = path.join(__dirname, "admin.html");
const CANVAS_FILE = path.join(__dirname, "canvas.js");

function loadEnv() {
  try {
    const text = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD || "change-me";
const COOKIE = "craft_site_admin";
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
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, type, extra) {
  res.writeHead(status, { "content-type": type || "text/plain; charset=utf-8", ...(extra || {}) });
  res.end(body);
}

function json(res, status, obj, extra) {
  send(res, status, JSON.stringify(obj), "application/json; charset=utf-8", extra);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readContent() {
  const raw = readJson(path.join(DATA, "content.json"), {});
  return {
    version: 1,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    publishedAt: raw.publishedAt,
    fields: raw.fields || {},
    forms: raw.forms || {},
    htmlBlocks: raw.htmlBlocks || [],
    menuInserts: raw.menuInserts || [],
    site: raw.site || {},
    pages: raw.pages || {},
    sections: raw.sections || { order: [], hidden: [], removed: [], inserts: [] },
  };
}

function writeContent(overlay) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, "content.json"), JSON.stringify(overlay, null, 2));
}

function resolveEmail(content, formId) {
  const direct = content.forms && content.forms[formId] && content.forms[formId].email;
  if (direct) return String(direct).trim();
  const all = Object.values(content.forms || {})
    .map((item) => item && item.email)
    .find(Boolean);
  return all ? String(all).trim() : "";
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function signSession() {
  return crypto.createHmac("sha256", SESSION_SECRET).update("ok").digest("hex");
}

function isAuthed(req) {
  return parseCookies(req)[COOKIE] === signSession();
}

function requireAdmin(req, res) {
  if (isAuthed(req)) return true;
  json(res, 401, { error: "Нужна авторизация" });
  return false;
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw;
}

function walkHtml(dir) {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets") continue;
      out.push(...walkHtml(abs));
    } else if (entry.name.endsWith(".html")) out.push(abs);
  }
  return out;
}

function pageOutputPath(pagePath) {
  const raw = String(pagePath || "/").replaceAll("\\", "/").trim();
  const clean = raw === "/" ? "/" : raw.replace(/\/+$/, "") || "/";
  if (clean === "/") return "index.html";
  if (clean.includes("..") || clean.includes("\0")) return null;
  const rel = clean.replace(/^\/+/, "");
  if (!rel || rel.startsWith("/") || /^[a-zA-Z]:/.test(rel)) return null;
  return `${rel}/index.html`;
}

function rewriteDonorOrigin(html, sourceUrl) {
  let host = "";
  try {
    host = new URL(sourceUrl).host;
  } catch {
    return html;
  }
  if (!host) return html;
  const hosts = [...new Set([host, host.replace(/^www\./i, ""), "www." + host.replace(/^www\./i, "")])];
  let next = html;
  for (const item of hosts) {
    const esc = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`https?:\\/\\/${esc}(?=["'])`, "gi"), "/");
    next = next.replace(new RegExp(`https?:\\/\\/${esc}(?=/|[?#]|$)`, "gi"), "");
  }
  return next;
}

function jsonForHtml(obj) {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function injectCanvas(html, fieldIds, sectionLabels, fieldTypes, quietIds) {
  const payload = jsonForHtml({
    ids: fieldIds || [],
    labels: sectionLabels || {},
    types: fieldTypes || {},
    quiet: quietIds || [],
  });
  const snippet = `<style id="craft-canvas-css">
[data-craft-field]{cursor:pointer}
[data-craft-field]:hover{outline:2px dashed #2271b1;outline-offset:2px}
[data-craft-field].craft-hit{outline:2px solid #2271b1;outline-offset:2px}
.craft-sec{position:relative;z-index:1;outline:1px dashed transparent;outline-offset:2px;padding-top:40px;box-sizing:border-box}
.craft-sec.cli-header,.craft-sec.cli-sticky{z-index:40}
.craft-sec:hover,.craft-sec.craft-sec-on{outline-color:#2271b1}
.craft-sec.craft-sec-on{outline-width:2px;outline-style:solid}
.craft-sec-hidden{opacity:.48;filter:grayscale(.15)}
.craft-sec-bar{position:absolute;top:6px;left:8px;right:8px;z-index:2;display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;background:#1d2327;color:#f0f0f1;font:12px/1.2 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.16);pointer-events:auto}
.craft-sec-bar span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.9}
.craft-sec-bar button{flex:none;border:0;border-radius:4px;background:#3c434a;color:#fff;font:inherit;padding:5px 8px;cursor:pointer}
.craft-sec-bar button:hover{background:#2271b1}
.craft-sec-bar button[data-act="remove"]{background:#8a2424}
.craft-html-quiet{padding-top:0!important;outline:none!important}
.craft-focus-out{display:none!important}
html[data-craft-focus]:not([data-craft-focus=""]) body{background:#c3c4c7!important}
html[data-craft-focus="html"] .craft-html-quiet,html[data-craft-focus="html"] .cli-html{min-height:72px;margin:16px;padding:16px!important;outline:1px dashed #2271b1;outline-offset:4px;background:#fff}
html[data-craft-focus="widget"] section.cli-block.pic,html[data-craft-focus="widget"] section[data-custom-class]{margin:16px;background:#fff}
[data-craft-insert]{outline:1px dashed #dba617;min-height:48px}
[data-craft-html-block]{outline:1px dashed #2271b1;min-height:32px}
[data-craft-editing]{outline:2px solid #2271b1;outline-offset:2px;caret-color:#2271b1;cursor:text}
</style>
<script type="application/json" id="craft-canvas-data">${payload}</script>
<script src="/__craft/canvas.js" defer></script>`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}</body>`);
  return html + snippet;
}

function pagePathFromRel(rel) {
  const n = String(rel || "").replaceAll("\\", "/");
  if (!n || n === "index.html") return "/";
  if (n.endsWith("/index.html")) return `/${n.slice(0, -"index.html".length)}`;
  if (n.endsWith(".html")) return `/${n}`;
  return `/${n}`;
}

function withSimilar(overlay, model) {
  return Object.assign({}, overlay || {}, { similar: (model && model.similar) || [] });
}

function publish(overlay) {
  const files = walkHtml(SOURCE);
  const origin = files.length ? SOURCE : ROOT;
  const list = files.length ? files : walkHtml(ROOT);
  const model = readJson(path.join(DATA, "page-model.json"), {});
  const patched = withSimilar(overlay, model);
  let count = 0;
  for (const file of list) {
    const rel = path.relative(origin, file);
    let html = fs.readFileSync(file, "utf8");
    if (model.sourceUrl) html = rewriteDonorOrigin(html, model.sourceUrl);
    html = applyContent(html, patched, pagePathFromRel(rel));
    const dest = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html);
    count += 1;
  }
  return count;
}

function servePublic(req, res, url) {
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
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && (url.pathname === "/favicon.ico" || url.pathname === "/favicon.i")) {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/__craft/canvas.js") {
    try {
      const js = fs.readFileSync(CANVAS_FILE);
      return send(res, 200, js, "text/javascript; charset=utf-8", {
        "cache-control": "no-cache",
      });
    } catch {
      return send(res, 500, "canvas.js missing");
    }
  }

  if (req.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) {
    try {
      const html = fs.readFileSync(ADMIN_FILE);
      return send(res, 200, html, "text/html; charset=utf-8");
    } catch {
      return send(res, 500, "admin.html missing");
    }
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    let body = {};
    try {
      body = JSON.parse((await readBody(req)) || "{}");
    } catch {
      return json(res, 400, { error: "JSON" });
    }
    if (!ADMIN_PASSWORD) return json(res, 500, { error: "Задайте ADMIN_PASSWORD в .env" });
    const given = Buffer.from(String(body.password || ""));
    const need = Buffer.from(ADMIN_PASSWORD);
    if (given.length !== need.length || !crypto.timingSafeEqual(given, need)) {
      return json(res, 401, { error: "Неверный пароль" });
    }
    return json(res, 200, { ok: true }, {
      "set-cookie": `${COOKIE}=${signSession()}; Path=/; HttpOnly; SameSite=Lax`,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    return json(res, 200, { ok: true }, {
      "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
    });
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (!requireAdmin(req, res)) return;
    if (req.method === "GET" && url.pathname === "/api/admin/state") {
      const content = readContent();
      const model = readJson(path.join(DATA, "page-model.json"), { pages: [], counts: {} });
      let leads = [];
      try {
        leads = fs
          .readFileSync(path.join(DATA, "leads.jsonl"), "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .reverse()
          .slice(0, 50);
      } catch {
        leads = [];
      }
      return json(res, 200, { content, model, leads, authed: true });
    }
    if (req.method === "GET" && url.pathname === "/api/admin/page-html") {
      const model = readJson(path.join(DATA, "page-model.json"), { pages: [] });
      const pagePath = url.searchParams.get("path") || "/";
      const page = (model.pages || []).find((item) => item.path === pagePath);
      if (!page) return send(res, 404, "Страница не в модели", "text/plain; charset=utf-8");
      const rel = pageOutputPath(page.path);
      if (!rel) return send(res, 400, "Некорректный путь", "text/plain; charset=utf-8");
      const file = path.resolve(SOURCE, rel);
      if (!file.startsWith(path.resolve(SOURCE) + path.sep) && file !== path.resolve(SOURCE, "index.html")) {
        return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
      }
      if (!fs.existsSync(file)) return send(res, 404, "Нет HTML в data/source", "text/plain; charset=utf-8");
      const fieldIds = (page.sections || []).flatMap((section) =>
        (section.fields || []).map((field) => field.nodeId).filter(Boolean),
      );
      const content = readContent();
      (content.menuInserts || []).forEach((item) => {
        (item.itemNodeIds || []).forEach((id) => fieldIds.push(id));
        (item.textNodeIds || []).forEach((id) => fieldIds.push(id));
      });
      const sectionLabels = Object.fromEntries(
        (page.sections || []).map((section) => [section.id, section.label || section.id]),
      );
      const fieldTypes = Object.fromEntries(
        (page.sections || []).flatMap((section) =>
          (section.fields || []).filter((field) => field.nodeId).map((field) => [field.nodeId, field.type]),
        ),
      );
      (content.menuInserts || []).forEach((item) => {
        (item.itemNodeIds || []).forEach((id) => {
          fieldTypes[id] = "link";
        });
        (item.textNodeIds || []).forEach((id) => {
          fieldTypes[id] = "text";
        });
      });
      const quietIds = [...new Set(
        (model.pages || []).flatMap((item) =>
          (item.sections || [])
            .filter((section) =>
              (section.type === "html" && (section.scope === "site" || section.static))
              || section.similarKey
              || section.customClass,
            )
            .map((section) => section.id),
        ),
      )];
      let raw = fs.readFileSync(file, "utf8");
      if (model.sourceUrl) raw = rewriteDonorOrigin(raw, model.sourceUrl);
      const html = injectCanvas(
        applyContent(raw, withSimilar(content, model), page.path),
        fieldIds,
        sectionLabels,
        fieldTypes,
        quietIds,
      );
      return send(res, 200, html, "text/html; charset=utf-8", {
        "cache-control": "private, max-age=0, must-revalidate",
      });
    }
    if (req.method === "PUT" && url.pathname === "/api/admin/content") {
      let body = {};
      try {
        body = JSON.parse((await readBody(req)) || "{}");
      } catch {
        return json(res, 400, { error: "JSON" });
      }
      const current = readContent();
      const next = {
        version: 1,
        updatedAt: new Date().toISOString(),
        publishedAt: current.publishedAt,
        fields: body.fields || {},
        forms: body.forms || {},
        htmlBlocks: body.htmlBlocks || [],
        menuInserts: body.menuInserts || [],
        site: body.site != null ? body.site : current.site || {},
        pages: body.pages != null ? body.pages : current.pages || {},
        sections: body.sections != null ? body.sections : current.sections || { order: [], hidden: [], removed: [], inserts: [] },
      };
      writeContent(next);
      return json(res, 200, next);
    }
    if (req.method === "POST" && url.pathname === "/api/admin/publish") {
      const overlay = readContent();
      overlay.publishedAt = new Date().toISOString();
      overlay.updatedAt = overlay.publishedAt;
      writeContent(overlay);
      const files = publish(overlay);
      return json(res, 200, { ok: true, files, publishedAt: overlay.publishedAt });
    }
    return json(res, 404, { error: "Not found" });
  }

  if (req.method === "POST" && url.pathname === "/api/form") {
    let body = {};
    try {
      body = JSON.parse((await readBody(req)) || "{}");
    } catch {
      return json(res, 400, { error: "JSON" });
    }
    const fields = body.fields || {};
    const filled = Object.values(fields).some((value) => String(value || "").trim());
    if (!filled) return json(res, 400, { error: "Заполните поля формы" });
    const to = resolveEmail(readContent(), body.formId || "");
    const lead = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      formId: body.formId || "",
      page: body.page || "/",
      fields,
      to: to || "",
      emailed: false,
    };
    fs.mkdirSync(DATA, { recursive: true });
    fs.appendFileSync(path.join(DATA, "leads.jsonl"), `${JSON.stringify(lead)}\n`);
    return json(res, 200, { ok: true, emailed: false, message: "Заявка сохранена в админке" });
  }

  servePublic(req, res, url);
});

server.listen(PORT, () => {
  console.log("Site  http://127.0.0.1:" + PORT + "/");
  console.log("Admin http://127.0.0.1:" + PORT + "/admin");
});
