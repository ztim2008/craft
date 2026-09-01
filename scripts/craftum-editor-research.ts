/**
 * Разведка API редактора Craftum (только свой аккаунт).
 * Учётные данные: CRAFTUM_EMAIL + CRAFTUM_PASSWORD в .env (не коммитить).
 *
 *   npx tsx scripts/craftum-editor-research.ts
 */
import { chromium, type Request } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const EDITOR_URL = process.env.CRAFTUM_EDITOR_URL; // задайте явно; не ходим на чужой site_id по умолчанию

const OUT_DIR = join(
  import.meta.dirname ?? __dirname,
  "../docs/craftum-blocks-research/captured",
);

function loadEnv(): void {
  try {
    const raw = readFileSync(join(import.meta.dirname ?? __dirname, "../.env"), "utf8");
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
    /* no .env */
  }
}

type Captured = {
  url: string;
  method: string;
  status?: number;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
};

function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out = { ...h };
  for (const k of Object.keys(out)) {
    if (/^(cookie|authorization|x-.*token)/i.test(k)) out[k] = "[REDACTED]";
  }
  return out;
}

function interesting(req: Request): boolean {
  const u = req.url();
  if (!/craftum\.(com|io|ru)/i.test(u)) return false;
  if (/yandex|mc\.|metrika|analytics|version\.json/i.test(u)) return false;
  return /templates|blocks|pages|elements|design|api/i.test(u);
}

async function main(): Promise<void> {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) {
    console.error("CRAFTUM_EMAIL и CRAFTUM_PASSWORD в .env");
    process.exit(1);
  }
  if (!EDITOR_URL) {
    console.error("Задайте CRAFTUM_EDITOR_URL в .env (URL тестового сайта, не 954959)");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const captured: Captured[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "ru-RU",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("requestfinished", async (req) => {
    if (!interesting(req)) return;
    try {
      const res = await req.response();
      const entry: Captured = {
        url: req.url(),
        method: req.method(),
        status: res?.status(),
        requestHeaders: redactHeaders(req.headers()),
        requestBody: req.postData() ?? undefined,
      };
      if (res && res.status() === 200) {
        const ct = res.headers()["content-type"] ?? "";
        if (/json|text/i.test(ct)) {
          const body = await res.text();
          entry.responseBody = body.slice(0, 200_000);
        }
      }
      captured.push(entry);
      console.log(`[net] ${entry.method} ${entry.status} ${entry.url.slice(0, 120)}`);
    } catch {
      /* aborted */
    }
  });

  console.log("→ login");
  await page.goto("https://craftum.com/login", { waitUntil: "networkidle", timeout: 60_000 });

  const emailSel =
    'input[type="email"], input[name="email"], input[name="login"], input[autocomplete="username"]';
  const passSel = 'input[type="password"]';
  await page.locator(emailSel).first().fill(email, { timeout: 15_000 });
  await page.locator(passSel).first().fill(password);
  await page
    .locator('button[type="submit"], button:has-text("Войти"), button:has-text("Log in")')
    .first()
    .click();
  await page.waitForURL(/craftum\.com\/(app|dashboard|sites)/, { timeout: 60_000 }).catch(() => {
    console.warn("После логина URL неожиданный:", page.url());
  });

  console.log("→ editor", EDITOR_URL);
  await page.goto(EDITOR_URL, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(5000);

  await page.screenshot({
    path: join(OUT_DIR, "editor-loaded.png"),
    fullPage: false,
  });

  // Попытка открыть «+» между секциями
  const plus = page.locator(
    '[data-testid*="add"], button[aria-label*="добав"], .add-block, [class*="add-section"], [class*="AddBlock"]',
  );
  if ((await plus.count()) > 0) {
    console.log("→ click +");
    await plus.first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(OUT_DIR, "after-plus.png") });
  } else {
    console.log("Кнопку «+» не нашли автоматически — см. editor-loaded.png");
  }

  const outFile = join(OUT_DIR, "network-capture.json");
  writeFileSync(outFile, JSON.stringify({ editorUrl: EDITOR_URL, captured }, null, 2));
  console.log(`\nСохранено: ${outFile} (${captured.length} запросов)`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
