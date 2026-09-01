/**
 * Создать НОВЫЙ тестовый сайт в Craftum (существующие не трогаем).
 * Учётные данные в .env: CRAFTUM_EMAIL, CRAFTUM_PASSWORD
 *
 *   npx tsx scripts/craftum-create-test-site.ts
 */
import { chromium, type Page, type Request } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../docs/craftum-blocks-research/captured");
const PROTECTED_SITE_IDS = new Set(["954959"]);

const TEST_SITE_NAME = `blocks-ext-test-${new Date().toISOString().slice(0, 10)}`;

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
  if (/yandex|metrika|analytics|version\.json|83230486/i.test(u)) return false;
  return /templates|sites|pages|blocks|elements|design|api/i.test(u);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false });
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("https://craftum.com/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await shot(page, "01-login");

  const emailInput = page
    .locator('input[type="email"], input[name="email"], input[name="login"]')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 20_000 });
  await emailInput.fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  await page
    .locator(
      'button[type="submit"], button:has-text("Войти"), button:has-text("Вход"), button:has-text("Log in")',
    )
    .first()
    .click();

  await page.waitForTimeout(4000);
  await shot(page, "02-after-login");
  console.log("logged in →", page.url());
}

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => {});
  // лоадер «три точки»
  await page
    .locator('[class*="loader"], [class*="spinner"], [class*="preloader"]')
    .first()
    .waitFor({ state: "hidden", timeout: 60_000 })
    .catch(() => {});
  await page.waitForTimeout(3000);
}

async function createNewSite(page: Page): Promise<{ siteId?: string; editorUrl?: string }> {
  await page.goto("https://craftum.com/app/sites", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForAppReady(page);
  await shot(page, "03-app-dashboard");

  const createBtn = page.locator(
    [
      'button:has-text("Создать сайт")',
      'a:has-text("Создать сайт")',
      'button:has-text("Добавить сайт")',
      'a:has-text("Добавить сайт")',
      'button:has-text("Новый сайт")',
      'a:has-text("Новый сайт")',
      'button:has-text("Создать")',
      'a:has-text("Создать")',
      '[href*="create"]',
      '[href*="new"]',
    ].join(", "),
  );
  if ((await createBtn.count()) === 0) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    writeFileSync(join(OUT_DIR, "03-dashboard-text.txt"), bodyText.slice(0, 5000));
    throw new Error('Кнопку «Создать сайт» не нашли — см. 03-app-dashboard.png и 03-dashboard-text.txt');
  }
  await createBtn.first().click();
  await page.waitForTimeout(2000);
  await shot(page, "04-create-wizard");

  // Имя сайта (если спросят)
  const nameInput = page.locator(
    'input[name="name"], input[placeholder*="назван"], input[placeholder*="Назван"], input[type="text"]',
  );
  if ((await nameInput.count()) > 0) {
    await nameInput.first().fill(TEST_SITE_NAME);
  }

  const continueBtn = page.locator(
    [
      'button:has-text("Создать")',
      'button:has-text("Продолжить")',
      'button:has-text("Далее")',
      'button:has-text("Готово")',
      'button:has-text("Выбрать")',
    ].join(", "),
  );
  if ((await continueBtn.count()) > 0) {
    await continueBtn.first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }
  await shot(page, "05-after-create");

  // Пустой шаблон / с нуля
  const blank = page.locator(
    [
      'button:has-text("Пустой")',
      'div:has-text("Пустой сайт")',
      'div:has-text("С нуля")',
      'button:has-text("С нуля")',
    ].join(", "),
  );
  if ((await blank.count()) > 0) {
    await blank.first().click();
    await page.waitForTimeout(2000);
    const pick = page.locator('button:has-text("Выбрать"), button:has-text("Создать")').first();
    if (await pick.isVisible().catch(() => false)) await pick.click();
    await page.waitForTimeout(5000);
  }
  await shot(page, "06-editor-or-sites");

  const url = page.url();
  const siteMatch = url.match(/\/site\/(\d+)/);
  const pageMatch = url.match(/\/page\/(\d+)/);
  if (siteMatch) {
    const siteId = siteMatch[1];
    if (PROTECTED_SITE_IDS.has(siteId)) {
      throw new Error(`Попали на защищённый сайт ${siteId} — остановка`);
    }
    return {
      siteId,
      editorUrl: pageMatch ? url : `https://craftum.com/app/site/${siteId}`,
    };
  }

  // Ищем ссылку на новый сайт по имени
  const newSiteLink = page.locator(`a:has-text("${TEST_SITE_NAME}")`).first();
  if (await newSiteLink.isVisible().catch(() => false)) {
    await newSiteLink.click();
    await page.waitForTimeout(4000);
    const u2 = page.url();
    const m = u2.match(/\/site\/(\d+)/);
    if (m && !PROTECTED_SITE_IDS.has(m[1])) {
      return { siteId: m[1], editorUrl: u2 };
    }
  }

  return {};
}

async function main(): Promise<void> {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) {
    console.error(
      [
        "Нужны учётные данные Craftum в .env:",
        "  CRAFTUM_EMAIL=...   (или уже есть ADMIN_EMAIL)",
        "  CRAFTUM_PASSWORD=...   ← пароль текстом, не ADMIN_PASSWORD_HASH",
        "",
        "ADMIN_PASSWORD_HASH — это хеш админки Craft, для логина в craftum.com не подходит.",
      ].join("\n"),
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const captured: Captured[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ru-RU", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

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
        if (/json/i.test(ct)) entry.responseSnippet = (await res.text()).slice(0, 100_000);
      }
      captured.push(entry);
      console.log(`[net] ${entry.method} ${entry.status} ${entry.url.slice(0, 100)}`);
    } catch {
      /* */
    }
  });

  await login(page, email, password);
  const { siteId, editorUrl } = await createNewSite(page);

  if (editorUrl && !editorUrl.includes("/page/")) {
    await page.goto(editorUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(5000);
    await shot(page, "07-site-home");
  }

  const result = {
    testSiteName: TEST_SITE_NAME,
    siteId: siteId ?? null,
    editorUrl: page.url(),
    protectedSkipped: [...PROTECTED_SITE_IDS],
    captured,
  };

  writeFileSync(join(OUT_DIR, "test-site-created.json"), JSON.stringify(result, null, 2));
  writeFileSync(
    join(__dirname, "../docs/craftum-blocks-research/test-site.md"),
    [
      "# Тестовый сайт Craftum (разведка расширения)",
      "",
      `Создан скриптом: \`${TEST_SITE_NAME}\``,
      "",
      "| Поле | Значение |",
      "|------|----------|",
      `| site_id | ${siteId ?? "— см. скрины"} |`,
      `| editor | ${page.url()} |`,
      "",
      "**Не трогать:** site `954959` (fy4299.craftum.io).",
      "",
      "Скрины: `captured/01-login.png` … `07-site-home.png`",
    ].join("\n"),
  );

  console.log("\nГотово:", JSON.stringify({ siteId, url: page.url() }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
