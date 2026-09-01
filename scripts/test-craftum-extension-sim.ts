/**
 * Симуляция content-script без GUI (сервер без X11).
 * Та же логика, что craftum-blocks-extension/content/editor.js
 */
import { chromium, type Page } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../docs/craftum-blocks-research/captured");
const TEST_SITE_ID = "954965";

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

async function insertDesignBlockInPage(page: Page): Promise<void> {
  const library = page.locator(".page__select-block, .select-block");
  if ((await library.count()) === 0) {
    const btn = page.getByRole("button", { name: "Выбрать блок" });
    if (await btn.isVisible().catch(() => false)) await btn.click({ force: true });
    await page.waitForTimeout(1500);
  }
  await page.locator("button.btn.gradient.db, .select-block button").filter({ hasText: "Дизайн-блок" }).first().click({ force: true });
  await page.waitForTimeout(2500);
  const back = page.getByRole("button", { name: /Вернуться к редактированию страницы/ });
  if (await back.isVisible().catch(() => false)) {
    await back.click();
    await page.waitForTimeout(2000);
  }
}

async function main(): Promise<void> {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) process.exit(1);

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ru-RU", viewport: { width: 1440, height: 900 } });

  await page.goto("https://craftum.com/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Войти")').first().click();
  await page.waitForTimeout(4000);

  const res = await page.request.post("https://api-v2.craftum.com/pages/", {
    data: { website_id: Number(TEST_SITE_ID) },
  });
  const { id: pageId } = (await res.json()) as { id: number };

  await page.goto(`https://craftum.com/app/site/${TEST_SITE_ID}/page/${pageId}?blank=true`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: join(OUT_DIR, "ext-sim-01-before.png") });

  await insertDesignBlockInPage(page);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT_DIR, "ext-sim-02-after.png") });

  const hasBlock = (await page.locator("section.cli-block, .cli-block").count()) > 0;
  const text = await page.locator("body").innerText();
  const result = {
    pageId,
    hypothesisOk: hasBlock || text.includes("empty-01") || text.includes("уникального дизайна"),
    hasBlockOnCanvas: hasBlock,
  };

  writeFileSync(join(OUT_DIR, "extension-sim-result.json"), JSON.stringify(result, null, 2));
  console.log("Результат симуляции расширения:", result);
  await browser.close();
  process.exit(result.hypothesisOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
