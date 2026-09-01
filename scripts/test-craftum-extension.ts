/**
 * E2E: расширение + логин + пустая страница + клик «Мои блоки» → Добавить.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, "../craftum-blocks-extension");
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

async function main(): Promise<void> {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) {
    console.error("CRAFTUM_EMAIL + CRAFTUM_PASSWORD в .env");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const userDataDir = join(OUT_DIR, "pw-extension-profile");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    locale: "ru-RU",
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
    ],
  });

  const page = context.pages()[0] || (await context.newPage());

  await page.goto("https://craftum.com/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"], button:has-text("Войти")').first().click();
  await page.waitForTimeout(4000);

  const res = await page.request.post("https://api-v2.craftum.com/pages/", {
    data: { website_id: Number(TEST_SITE_ID) },
  });
  const { id: pageId } = (await res.json()) as { id: number };
  console.log("новая страница:", pageId);

  const editorUrl = `https://craftum.com/app/site/${TEST_SITE_ID}/page/${pageId}?blank=true`;
  await page.goto(editorUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(6000);

  await page.screenshot({ path: join(OUT_DIR, "ext-01-before.png") });

  const fab = page.locator("#craftum-blocks-fab");
  await fab.waitFor({ state: "visible", timeout: 30_000 });
  await fab.click();
  await page.waitForTimeout(500);

  await page.locator(".craftum-blocks-modal .primary").click();
  await page.waitForTimeout(8000);

  await page.screenshot({ path: join(OUT_DIR, "ext-02-after-insert.png") });

  const hasBlock = await page.locator("section.cli-block, .cli-block").count();
  const bodyText = await page.locator("body").innerText();
  const designEditor = bodyText.includes("ИЗМЕНЕНИЕ ДИЗАЙНА БЛОКА");
  const empty01 = bodyText.includes("empty-01");

  const result = {
    pageId,
    editorUrl,
    hasBlockOnCanvas: hasBlock > 0,
    designEditorOpen: designEditor,
    empty01Visible: empty01,
    hypothesisOk: hasBlock > 0 || designEditor || empty01,
  };

  writeFileSync(join(OUT_DIR, "extension-test-result.json"), JSON.stringify(result, null, 2));
  console.log("\nРезультат:", result);

  await context.close();
  process.exit(result.hypothesisOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
