import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createSessionToken, sessionCookieName } from "@/modules/adminAuth/session";
import { getContent, saveContent } from "@/modules/content/store";
import { buildExportZip } from "@/modules/export/buildExport";

function loadDotEnv(file: string) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function waitFor(url: string, ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 401) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("timeout " + url);
}

async function main() {
  loadDotEnv(path.join(process.cwd(), ".env"));
  const jobId = "41f73bdd-8e06-43e4-9916-8ec85ce468e0";
  const report: string[] = [];

  const home = await fetch("http://127.0.0.1:3040/");
  const homeHtml = await home.text();
  assert(
    home.status === 200 &&
      homeHtml.includes("Бесплатное демо") &&
      homeHtml.includes("t.me/bilarius") &&
      homeHtml.includes("Оставить заявку"),
    "public home",
  );
  report.push("user: GET / — landing ok");

  const demoDenied = await fetch("http://127.0.0.1:3040/api/demo/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://sx7238.craftum.io/", ownerConfirmed: false }),
  });
  assert(demoDenied.status === 400, "demo import requires owner confirm");
  report.push("user: demo import без галочки — 400");

  const jobsAuth = await fetch("http://127.0.0.1:3040/api/admin/jobs");
  assert(jobsAuth.status === 401, "operator API closed");
  report.push("user: /api/admin/jobs без сессии — 401");

  const token = await createSessionToken(process.env.ADMIN_EMAIL || "");
  const cookie = `${sessionCookieName()}=${token}`;
  const jobs = await fetch("http://127.0.0.1:3040/api/admin/jobs", { headers: { cookie } });
  assert(jobs.ok, "operator jobs with session");
  report.push("operator: список задач — ok");

  const model = JSON.parse(
    readFileSync(path.join(process.cwd(), "storage/projects", jobId, "page-model.json"), "utf8"),
  ) as { pages: Array<{ sections: Array<{ fields: Array<{ nodeId: string; type: string; value: string }> }> }> };
  const field = model.pages[0]?.sections
    .flatMap((s) => s.fields)
    .find((f) => f.type === "text" && f.nodeId.startsWith("n-"));
  assert(field, "text field exists");
  const prev = await getContent(jobId);
  const marker = `E2E-${Date.now()}`;
  try {
    await saveContent(jobId, {
      ...prev,
      fields: { ...prev.fields, [field.nodeId]: { value: marker } },
    });
    const preview = await fetch(`http://127.0.0.1:3040/preview/${jobId}/`);
    const previewHtml = await preview.text();
    assert(preview.ok && previewHtml.includes(marker), "operator patch visible in preview");
    report.push("operator: правка текста → preview");
  } finally {
    await saveContent(jobId, prev);
  }

  const zipPath = await buildExportZip(jobId, "https://sx7238.craftum.io/");
  const work = "/tmp/craft-e2e-export";
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const child = spawn("unzip", ["-q", zipPath, "-d", work]);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("unzip"))));
  });
  writeFileSync(path.join(work, ".env"), "PORT=3055\nADMIN_PASSWORD=e2e-pass\n");
  const server = spawn("node", ["server.mjs"], {
    cwd: work,
    env: { ...process.env, PORT: "3055", ADMIN_PASSWORD: "e2e-pass" },
  });
  try {
    await waitFor("http://127.0.0.1:3055/");
    const site = await fetch("http://127.0.0.1:3055/");
    assert(site.ok && (await site.text()).toLowerCase().includes("<html"), "client site");
    report.push("client: public site from zip");

    const adminPage = await fetch("http://127.0.0.1:3055/admin");
    assert(adminPage.ok && (await adminPage.text()).includes("Редактор страниц"), "client admin html");
    report.push("client: /admin editor page");

    const badLogin = await fetch("http://127.0.0.1:3055/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "nope" }),
    });
    assert(badLogin.status === 401, "wrong password");

    const login = await fetch("http://127.0.0.1:3055/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "e2e-pass" }),
    });
    const setCookie = login.headers.get("set-cookie") || "";
    assert(login.ok && setCookie.includes("craft_site_admin"), "client login");
    const c = setCookie.split(";")[0];

    const st = await fetch("http://127.0.0.1:3055/api/admin/state", { headers: { cookie: c } });
    const state = (await st.json()) as {
      model: {
        pages: Array<{
          sections: Array<{
            fields: Array<{ nodeId: string; type: string }>;
            forms: Array<{ id: string }>;
          }>;
        }>;
      };
      content: { fields: Record<string, { value: string }>; forms: Record<string, { email: string }> };
    };
    assert(st.ok && state.model.pages?.length, "client state");
    const f = state.model.pages[0].sections.flatMap((s) => s.fields).find((x) => x.type === "text");
    const form = state.model.pages[0].sections.flatMap((s) => s.forms)[0];
    const fields = { ...(state.content.fields || {}), [f!.nodeId]: { value: "ZIP-EDITOR-OK" } };
    const forms = { ...(state.content.forms || {}), ...(form ? { [form.id]: { email: "owner@example.ru" } } : {}) };
    const saved = await fetch("http://127.0.0.1:3055/api/admin/content", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: c },
      body: JSON.stringify({ fields, forms, htmlBlocks: [] }),
    });
    assert(saved.ok, "client save");
    const pub = await fetch("http://127.0.0.1:3055/api/admin/publish", { method: "POST", headers: { cookie: c } });
    const pubJson = (await pub.json()) as { files?: number };
    assert(pub.ok && (pubJson.files || 0) > 0, "client publish");
    const after = await fetch("http://127.0.0.1:3055/");
    assert((await after.text()).includes("ZIP-EDITOR-OK"), "published text on site");
    report.push("client: save + publish text on site");

    if (form) {
      const lead = await fetch("http://127.0.0.1:3055/api/form", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formId: form.id, fields: { name: "E2E", phone: "1" }, page: "/" }),
      });
      assert(lead.ok, "client form");
      report.push("client: form lead saved");
    }

    const payAuth = await fetch(`http://127.0.0.1:3040/api/demo/${jobId}/export`);
    assert(payAuth.status === 410, "public zip gone");
    report.push("user: ZIP с демо закрыт");

    const orderRes = await fetch(`http://127.0.0.1:3040/api/demo/${jobId}/order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan: "basic",
        name: "E2E",
        email: "e2e@example.ru",
      }),
    });
    const orderJson = (await orderRes.json()) as { orderId?: string; status?: string; error?: string };
    assert(orderRes.ok || orderRes.status === 201, orderJson.error || "order");
    if (orderJson.status !== "paid") {
      const pay = await fetch(`http://127.0.0.1:3040/api/admin/orders/${orderJson.orderId}/pay`, {
        method: "POST",
        headers: { cookie },
      });
      assert(pay.ok, "mark paid");
    }
    const zipGone = await fetch(`http://127.0.0.1:3040/api/demo/${jobId}/export?token=nope`);
    assert(zipGone.status === 410, "paid demo still no zip");
    report.push("user+operator: заявка → оплачено, ZIP не с /demo");
  } finally {
    server.kill();
  }

  console.log(report.map((line) => "OK  " + line).join("\n"));
}

main().catch((err) => {
  console.error("FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
