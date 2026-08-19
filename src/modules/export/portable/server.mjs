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
  const raw = String(pagePath || "/");
  const clean = raw === "/" ? "/" : raw.replace(/\/+$/, "") || "/";
  if (clean === "/") return "index.html";
  if (clean.includes("..") || path.isAbsolute(clean)) return null;
  return `${clean.replace(/^\//, "")}/index.html`;
}

function injectCanvas(html, fieldIds, sectionLabels) {
  const ids = JSON.stringify(fieldIds || []);
  const labels = JSON.stringify(sectionLabels || {});
  const snippet = `<style id="craft-canvas-css">
[data-craft-field]{cursor:pointer}
[data-craft-field]:hover{outline:2px dashed #2271b1;outline-offset:2px}
[data-craft-field].craft-hit{outline:2px solid #2271b1;outline-offset:2px}
.craft-sec{position:relative;outline:1px dashed transparent;outline-offset:-1px}
.craft-sec:hover,.craft-sec.craft-sec-on{outline-color:#2271b1}
.craft-sec.craft-sec-on{outline-width:2px;outline-style:solid}
.craft-sec-hidden{opacity:.48;filter:grayscale(.15)}
.craft-sec-bar{position:absolute;top:8px;left:8px;right:8px;z-index:2147483000;display:none;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;background:#1d2327;color:#f0f0f1;font:12px/1.2 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);pointer-events:auto}
.craft-sec:hover>.craft-sec-bar,.craft-sec.craft-sec-on>.craft-sec-bar,.craft-chrome .craft-sec>.craft-sec-bar{display:flex}
.craft-sec-bar span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.9}
.craft-sec-bar button{flex:none;border:0;border-radius:4px;background:#3c434a;color:#fff;font:inherit;padding:5px 8px;cursor:pointer}
.craft-sec-bar button:hover{background:#2271b1}
.craft-sec-bar button[data-act="remove"]{background:#8a2424}
[data-craft-insert]{outline:1px dashed #dba617;min-height:48px}
</style>
<script id="craft-canvas-js">
(function(){
  var ids=${ids};
  var labels=${labels};
  ids.forEach(function(id){
    var n=document.getElementById(id);
    if(n) n.setAttribute("data-craft-field","1");
  });
  function wrapInserts(){
    var root=document.body;
    if(!root) return;
    var walker=document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    var starts=[];
    while(walker.nextNode()){
      var v=walker.currentNode.nodeValue||"";
      if(/^craft-section:/.test(v.trim())) starts.push(walker.currentNode);
    }
    starts.forEach(function(start){
      var id=(start.nodeValue||"").trim().replace(/^craft-section:/,"");
      var wrap=document.createElement("div");
      wrap.setAttribute("data-craft-insert", id);
      var node=start.nextSibling;
      while(node && !(node.nodeType===8 && String(node.nodeValue||"").trim()==="/craft-section:"+id)){
        var next=node.nextSibling;
        wrap.appendChild(node);
        node=next;
      }
      start.parentNode.insertBefore(wrap, start.nextSibling);
    });
  }
  function mountBars(){
    wrapInserts();
    document.querySelectorAll("[data-craft-hidden]").forEach(function(n){
      n.removeAttribute("hidden");
      n.classList.add("craft-sec-hidden");
    });
    var nodes=Array.prototype.slice.call(document.querySelectorAll("section.cli-block[id], [data-craft-insert]"));
    nodes.forEach(function(sec){
      if (sec.firstElementChild && sec.firstElementChild.classList.contains("craft-sec-bar")) return;
      sec.classList.add("craft-sec");
      var insert=sec.hasAttribute("data-craft-insert");
      var id=insert ? sec.getAttribute("data-craft-insert") : sec.id;
      var bar=document.createElement("div");
      bar.className="craft-sec-bar";
      var title=document.createElement("span");
      title.textContent=(labels[id]|| (insert ? "Вставка HTML" : id));
      bar.appendChild(title);
      function btn(act, text){
        var b=document.createElement("button");
        b.type="button";
        b.setAttribute("data-act", act);
        b.textContent=text;
        bar.appendChild(b);
      }
      if(!insert){
        btn("up","↑");
        btn("down","↓");
        btn("hide", sec.classList.contains("craft-sec-hidden") ? "Показать" : "Скрыть");
      }
      btn("remove","Удалить");
      btn("insert","+ HTML");
      bar.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var t=e.target;
        if(!t || !t.getAttribute) return;
        var act=t.getAttribute("data-act");
        if(!act) return;
        parent.postMessage({source:"craft-canvas",sectionAction:{id:id,action:act,insert:insert}}, "*");
        postOutline({id:id,insert:insert}, false);
      });
      sec.insertBefore(bar, sec.firstChild);
    });
  }
  function sectionRef(el){
    while(el && el!==document.documentElement){
      if(el.getAttribute && el.getAttribute("data-craft-insert")) return {id:el.getAttribute("data-craft-insert"),insert:true};
      if(el.tagName==="SECTION" && el.id && (el.className||"").indexOf("cli-block")!==-1) return {id:el.id,insert:false};
      el=el.parentElement;
    }
    return null;
  }
  function postOutline(ref, spy){
    if(!ref || !ref.id) return;
    parent.postMessage({source:"craft-canvas",outline:{id:ref.id,insert:!!ref.insert,spy:!!spy}}, "*");
  }
  function revealSection(id, insert){
    document.querySelectorAll(".craft-sec-on").forEach(function(n){ n.classList.remove("craft-sec-on"); });
    var el = insert ? document.querySelector('[data-craft-insert="'+String(id).replace(/"/g,"")+'"]') : document.getElementById(id);
    if(!el) el = document.getElementById(id);
    if(!el) return;
    el.classList.add("craft-sec-on");
    el.scrollIntoView({block:"start",behavior:"smooth"});
  }
  mountBars();
  var spyTimer=0;
  function spyOutline(){
    if(spyTimer) return;
    spyTimer=setTimeout(function(){
      spyTimer=0;
      var nodes=document.querySelectorAll(".craft-sec");
      var pick=null, best=1e9;
      for(var i=0;i<nodes.length;i++){
        var r=nodes[i].getBoundingClientRect();
        if(r.bottom<8 || r.top>window.innerHeight*0.5) continue;
        var d=Math.abs(r.top-16);
        if(d<best){ best=d; pick=nodes[i]; }
      }
      if(pick) postOutline(sectionRef(pick), true);
    }, 140);
  }
  window.addEventListener("scroll", spyOutline, true);
  document.addEventListener("click",function(e){
    if(e.target && e.target.closest && e.target.closest(".craft-sec-bar")) return;
    e.preventDefault();
    e.stopPropagation();
    var ref=sectionRef(e.target);
    if(ref) postOutline(ref, false);
    var el=e.target;
    while(el && el!==document.documentElement){
      if(el.getAttribute && el.getAttribute("data-craft-field")){
        document.querySelectorAll(".craft-hit").forEach(function(n){ n.classList.remove("craft-hit"); });
        el.classList.add("craft-hit");
        parent.postMessage({source:"craft-canvas",nodeId:el.id}, "*");
        return;
      }
      el=el.parentElement;
    }
  }, true);
  document.addEventListener("submit",function(e){ e.preventDefault(); }, true);
  document.addEventListener("keydown",function(e){
    var key=(e.key||"").toLowerCase();
    if(!e.ctrlKey && !e.metaKey) return;
    if(key==="z"){
      e.preventDefault();
      parent.postMessage({source:"craft-canvas",history:e.shiftKey?"redo":"undo"}, "*");
    } else if(key==="y"){
      e.preventDefault();
      parent.postMessage({source:"craft-canvas",history:"redo"}, "*");
    }
  }, true);
  window.addEventListener("message",function(e){
    if(!e.data || e.data.source!=="craft-host") return;
    if(e.data.sectionChrome) document.documentElement.classList.add("craft-chrome");
    if(e.data.revealSection && e.data.revealSection.id){
      revealSection(e.data.revealSection.id, e.data.revealSection.insert);
    }
    if(e.data.highlight){
      document.querySelectorAll(".craft-hit").forEach(function(n){ n.classList.remove("craft-hit"); });
      var hit=document.getElementById(e.data.highlight);
      if(hit){ hit.classList.add("craft-hit"); hit.scrollIntoView({block:"center",behavior:"smooth"}); }
    }
    if(e.data.patch && e.data.nodeId){
      var n=document.getElementById(e.data.nodeId);
      if(!n) return;
      var p=e.data.patch;
      if(p.href!=null) n.setAttribute("href", p.href);
      if(n.tagName==="IMG" && (p.src!=null || p.value!=null)) n.setAttribute("src", p.src || p.value);
      else if(p.value!=null){
        var hasEl=false;
        for(var i=0;i<n.childNodes.length;i++){ if(n.childNodes[i].nodeType===1){ hasEl=true; break; } }
        if(!hasEl) n.textContent=p.value;
        else {
          for(var j=0;j<n.childNodes.length;j++){
            if(n.childNodes[j].nodeType===3 && n.childNodes[j].textContent.trim()){
              n.childNodes[j].textContent=p.value;
              break;
            }
          }
        }
      }
    }
  });
})();
</script>`;
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

function publish(overlay) {
  const files = walkHtml(SOURCE);
  const origin = files.length ? SOURCE : ROOT;
  const list = files.length ? files : walkHtml(ROOT);
  let count = 0;
  for (const file of list) {
    const rel = path.relative(origin, file);
    const html = applyContent(fs.readFileSync(file, "utf8"), overlay, pagePathFromRel(rel));
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
      const sectionLabels = Object.fromEntries(
        (page.sections || []).map((section) => [section.id, section.label || section.id]),
      );
      const html = injectCanvas(
        applyContent(fs.readFileSync(file, "utf8"), readContent(), page.path),
        fieldIds,
        sectionLabels,
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
