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

function publish(overlay) {
  const files = walkHtml(SOURCE);
  const origin = files.length ? SOURCE : ROOT;
  const list = files.length ? files : walkHtml(ROOT);
  let count = 0;
  for (const file of list) {
    const rel = path.relative(origin, file);
    const html = applyContent(fs.readFileSync(file, "utf8"), overlay);
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
    if (!to) return json(res, 400, { error: "В админке не указан email формы" });
    const lead = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      formId: body.formId || "",
      page: body.page || "/",
      fields,
      to,
      emailed: false,
    };
    fs.mkdirSync(DATA, { recursive: true });
    fs.appendFileSync(path.join(DATA, "leads.jsonl"), `${JSON.stringify(lead)}\n`);
    return json(res, 200, { ok: true, emailed: false, message: "Заявка сохранена" });
  }

  servePublic(req, res, url);
});

server.listen(PORT, () => {
  console.log("Site  http://127.0.0.1:" + PORT + "/");
  console.log("Admin http://127.0.0.1:" + PORT + "/admin");
});
