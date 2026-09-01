/**
 * Тест-сайт 954965: пустая страница → редактор → «+» → дизайн-блок → Network.
 * Не трогает site 954959.
 *
 *   npx tsx scripts/craftum-editor-block-research.ts
 */
import { chromium, type Page, type Request } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../docs/craftum-blocks-research/captured");
const TEST_SITE_ID = process.env.CRAFTUM_TEST_SITE_ID ?? "954965";
const PROTECTED = new Set(["954959"]);

type Captured = {
  url: string;
  method: string;
  status?: number;
  requestBody?: string;
  responseSnippet?: string;
};

function loadEnv(): void {
  try {
    const raw = readFileSync(join(__dirname, "../.env"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i);
      const v = t.slice(i + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* */
  }
}

function interesting(req: Request): boolean {
  const u = req.url();
  if (!/craftum\.(com|io|ru)/i.test(u)) return false;
  if (/yandex|metrika|mail\.ru|83230486|version\.json|google-analytics/i.test(u)) return false;
  if (/analytics\/event/i.test(u)) return false;
  return /api|templates|presets|pages|blocks|elements|folders|websites/i.test(u);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false });
}

async function waitReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("https://craftum.com/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"], button:has-text("Войти")').first().click();
  await page.waitForTimeout(4000);
}

async function ensureEditorPage(page: Page): Promise<string> {
  if (PROTECTED.has(TEST_SITE_ID)) throw new Error(`Защищённый site_id ${TEST_SITE_ID}`);

  const siteUrl = `https://craftum.com/app/site/${TEST_SITE_ID}`;
  await page.goto(siteUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitReady(page);
  await shot(page, "10-site-home");

  // Уже в редакторе страницы?
  if (/\/page\/\d+/.test(page.url())) return page.url();

  // «Создать страницу» / «Добавить страницу»
  const addPage = page.locator(
    [
      'button:has-text("Создать страницу")',
      'a:has-text("Создать страницу")',
      'button:has-text("Добавить страницу")',
      'button:has-text("Новая страница")',
      'button:has-text("Создать")',
    ].join(", "),
  );
  if ((await addPage.count()) > 0) {
    await addPage.first().click();
    await waitReady(page);
    await shot(page, "11-add-page-click");
  }

  // Экран выбора шаблона — ищем пустой / минимальный
  const search = page.locator('input[placeholder*="Поиск"], input[placeholder*="поиск"]');
  if (await search.isVisible().catch(() => false)) {
    await search.fill("пуст");
    await page.waitForTimeout(1500);
    await shot(page, "12-template-search");
  }

  const blankPick = page.locator(
    [
      'div:has-text("Пустая")',
      'div:has-text("пустая")',
      'div:has-text("Пустой")',
      'button:has-text("Пустая")',
      '[class*="template"]:has-text("Пуст")',
    ].join(", "),
  );
  if ((await blankPick.count()) > 0) {
    await blankPick.first().click();
    await page.waitForTimeout(1500);
    await shot(page, "13-blank-selected");
  } else {
    // первый шаблон в сетке
    const card = page.locator('[class*="template"], [class*="preset"], [class*="card"]').first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(1500);
      await shot(page, "13-first-template");
    }
  }

  const confirm = page.locator(
    'button:has-text("Выбрать"), button:has-text("Создать"), button:has-text("Использовать")',
  );
  if ((await confirm.count()) > 0) {
    await confirm.first().click();
    await waitReady(page);
  }

  await shot(page, "14-after-template");

  // Клик по существующей странице в списке
  if (!/\/page\/\d+/.test(page.url())) {
    const pageLink = page.locator(`a[href*="/site/${TEST_SITE_ID}/page/"]`).first();
    if (await pageLink.isVisible().catch(() => false)) {
      await pageLink.click();
      await waitReady(page);
    }
  }

  // Прямой переход если знаем page из URL
  const m = page.url().match(/\/page\/(\d+)/);
  if (m) return page.url();

  // Открыть «Главная» / первую страницу
  const main = page.locator('a:has-text("Главная"), [href*="/page/"]').first();
  if (await main.isVisible().catch(() => false)) {
    await main.click();
    await waitReady(page);
  }

  await shot(page, "15-editor-attempt");
  return page.url();
}

async function createBlankPageViaApi(page: Page): Promise<number> {
  const res = await page.request.post("https://api-v2.craftum.com/pages/", {
    data: { website_id: Number(TEST_SITE_ID) },
  });
  if (!res.ok()) throw new Error(`POST /pages/ failed: ${res.status()} ${await res.text()}`);
  const json = (await res.json()) as { id?: number };
  if (!json.id) throw new Error("POST /pages/ без id");
  console.log("новая страница:", json.id);
  return json.id;
}

async function openBlankPageEditor(page: Page, pageId: number): Promise<void> {
  const url = `https://craftum.com/app/site/${TEST_SITE_ID}/page/${pageId}?blank=true`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitReady(page);
  await shot(page, "20-editor");
}

async function tryAddDesignBlock(page: Page): Promise<void> {
  const libraryOpen = await page
    .locator(".select-block, .page__select-block")
    .isVisible()
    .catch(() => false);
  if (!libraryOpen) {
    const chooseBlock = page.getByRole("button", { name: "Выбрать блок" });
    if (await chooseBlock.isVisible().catch(() => false)) {
      await chooseBlock.click({ force: true });
      await page.waitForTimeout(2000);
    }
  }
  await shot(page, "21-block-library");

  const mode = process.env.CRAFTUM_BLOCK_MODE ?? "design";

  if (mode === "cover") {
    const coverCard = page.locator(".select-block-card").filter({ hasText: "cover-01" }).first();
    if (await coverCard.isVisible().catch(() => false)) {
      const postWait = page.waitForResponse(
        (r) => /api-v2\.craftum\.com/i.test(r.url()) && !/analytics/i.test(r.url()),
        { timeout: 20_000 },
      );
      await coverCard.click();
      const postRes = await postWait.catch(() => null);
      if (postRes) {
        const req = postRes.request();
        console.log(`[cover ${req.method()}]`, postRes.url(), postRes.status());
        console.log("  body:", req.postData()?.slice(0, 800));
      }
      await waitReady(page);
      await shot(page, "22-cover-added");
    }
    return;
  }

  const designBlockNav = page.locator("aside, nav").getByText("Дизайн-блок", { exact: true });
  if (await designBlockNav.isVisible().catch(() => false)) {
    const postWait = page.waitForResponse(
      (r) => /api-v2\.craftum\.com/i.test(r.url()) && !/analytics/i.test(r.url()),
      { timeout: 20_000 },
    );
    await designBlockNav.click();
    const postRes = await postWait.catch(() => null);
    if (postRes) {
      const req = postRes.request();
      console.log(`[design-block ${req.method()}]`, postRes.url(), postRes.status());
      console.log("  body:", req.postData()?.slice(0, 800));
      const txt = await postRes.text().catch(() => "");
      console.log("  resp:", txt.slice(0, 400));
    }
    await page.waitForTimeout(3000);
    await shot(page, "22-design-block-tab");
    return;
  }

  // cover-01 — штатный блок, должен дать POST
  const coverCard = page.locator(".select-block-card").filter({ hasText: "cover-01" }).first();
  if (await coverCard.isVisible().catch(() => false)) {
    const postWait = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /api-v2\.craftum\.com/i.test(r.url()) &&
        !/analytics/i.test(r.url()),
      { timeout: 20_000 },
    );
    await coverCard.click();
    const postRes = await postWait.catch(() => null);
    if (postRes) {
      console.log("[cover POST]", postRes.url(), postRes.status());
      console.log("  body:", postRes.request().postData()?.slice(0, 500));
    }
    await waitReady(page);
  }
  await shot(page, "23-block-added");
}

async function main(): Promise<void> {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  const directEditor =
    process.env.CRAFTUM_EDITOR_URL ??
    `https://craftum.com/app/site/${TEST_SITE_ID}/page/1496882`;
  if (!email || !password) {
    console.error("CRAFTUM_EMAIL + CRAFTUM_PASSWORD в .env");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const captured: Captured[] = [];
  const postRequests: Captured[] = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ru-RU", viewport: { width: 1440, height: 900 } });

  page.on("requestfinished", async (req) => {
    if (!interesting(req)) return;
    try {
      const res = await req.response();
      const entry: Captured = {
        url: req.url(),
        method: req.method(),
        status: res?.status(),
        requestBody: req.postData() ?? undefined,
      };
      if (res?.ok()) {
        const ct = res.headers()["content-type"] ?? "";
        if (/json/i.test(ct)) entry.responseSnippet = (await res.text()).slice(0, 150_000);
      }
      captured.push(entry);
      if (entry.method === "POST" || entry.method === "PUT" || entry.method === "PATCH") {
        postRequests.push(entry);
        console.log(`[${entry.method}] ${entry.status} ${entry.url}`);
        if (entry.requestBody) console.log(`  body: ${entry.requestBody.slice(0, 300)}`);
      }
    } catch {
      /* */
    }
  });

  await login(page, email, password);

  const pageId = await createBlankPageViaApi(page);
  await openBlankPageEditor(page, pageId);
  console.log("editor url:", page.url());

  // Только POST после этого — добавление блока
  const beforePost = postRequests.length;
  await tryAddDesignBlock(page);

  const blockPosts = postRequests.slice(beforePost);
  const summary = {
    testSiteId: TEST_SITE_ID,
    pageId,
    editorUrl: page.url(),
    blockInsertPosts: blockPosts,
    allCapturedCount: captured.length,
    templatesGets: captured.filter((c) => /templates/i.test(c.url)),
  };

  writeFileSync(join(OUT_DIR, "block-insert-api.json"), JSON.stringify(summary, null, 2));
  writeFileSync(
    join(OUT_DIR, "block-insert-api-redacted.md"),
    [
      "# API вставки блока (тест site " + TEST_SITE_ID + ")",
      "",
      "## POST при добавлении блока",
      "",
      ...blockPosts.map(
        (p) =>
          `### ${p.method} ${p.url}\n\n\`\`\`json\n${p.requestBody ?? "(no body)"}\n\`\`\`\n`,
      ),
      blockPosts.length === 0 ? "_POST не пойман — см. скрины 20–24_" : "",
    ].join("\n"),
  );

  console.log("\nГотово:", page.url());
  console.log(`POST при вставке блока: ${blockPosts.length}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
