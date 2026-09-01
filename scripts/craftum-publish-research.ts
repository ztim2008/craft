/**
 * Перехват API Craftum: страница, create_block, сохранение.
 * Тест-сайт 954965 только.
 */
import { chromium, type Page, type Request } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../docs/craftum-blocks-research/captured");
const SITE = "954965";

function loadEnv(): void {
  try {
    for (const line of readFileSync(join(__dirname, "../.env"), "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
    }
  } catch {
    /* */
  }
}

type Capture = {
  url: string;
  method: string;
  status?: number;
  requestBody?: string;
  responseBody?: string;
};

function watch(page: Page, bucket: Capture[]): void {
  page.on("requestfinished", async (req: Request) => {
    const url = req.url();
    if (!/api-v2\.craftum\.com/i.test(url)) return;
    if (/analytics|event|version\.json/i.test(url)) return;
    try {
      const res = await req.response();
      const entry: Capture = {
        url,
        method: req.method(),
        status: res?.status(),
        requestBody: req.postData() ?? undefined,
      };
      if (res?.ok()) {
        const ct = res.headers()["content-type"] ?? "";
        if (/json/i.test(ct)) {
          entry.responseBody = (await res.text()).slice(0, 500_000);
        }
      }
      bucket.push(entry);
      if (["POST", "PUT", "PATCH"].includes(entry.method)) {
        console.log(`[${entry.method}] ${entry.status} ${url}`);
        if (entry.requestBody) console.log("  req:", entry.requestBody.slice(0, 400));
      }
    } catch {
      /* */
    }
  });
}

async function main(): Promise<void> {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) process.exit(1);

  mkdirSync(OUT, { recursive: true });
  const captured: Capture[] = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ru-RU", viewport: { width: 1440, height: 900 } });
  watch(page, captured);

  await page.goto("https://craftum.com/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Войти")').first().click();
  await page.waitForTimeout(4000);

  const createRes = await page.request.post("https://api-v2.craftum.com/pages/", {
    data: { website_id: Number(SITE) },
  });
  const { id: pageId } = (await createRes.json()) as { id: number };
  console.log("pageId", pageId);

  // GET page model
  const getPage = await page.request.get(`https://api-v2.craftum.com/pages/${pageId}/`);
  console.log("GET page", getPage.status(), (await getPage.text()).slice(0, 300));

  await page.goto(`https://craftum.com/app/site/${SITE}/page/${pageId}?blank=true`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(6000);

  const beforeMutations = captured.length;

  // insert cover-03
  const coverBtn = page.locator(".select-block-card").filter({ hasText: "cover-03" }).first();
  if (await coverBtn.isVisible().catch(() => false)) {
    await coverBtn.click({ force: true });
    await page.waitForTimeout(4000);
  }

  const afterInsert = captured.slice(beforeMutations).filter((c) => c.method === "POST" || c.method === "PATCH");

  // try save page
  const saveBtn = page.locator('button:has-text("Сохранить"), button:has-text("Опубликовать")').first();
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(5000);
  }

  const getPage2 = await page.request.get(`https://api-v2.craftum.com/pages/${pageId}/`);
  const pageJson = await getPage2.text();

  // blocks endpoint guesses
  const endpoints = [
    `https://api-v2.craftum.com/pages/${pageId}/`,
    `https://api-v2.craftum.com/pages/${pageId}/blocks/`,
    `https://api-v2.craftum.com/blocks/?page_id=${pageId}`,
    `https://api-v2.craftum.com/blocks/blocks/?page_id=${pageId}`,
  ];
  const probe: Record<string, { status: number; snippet: string }> = {};
  for (const url of endpoints) {
    const r = await page.request.get(url);
    probe[url] = { status: r.status(), snippet: (await r.text()).slice(0, 2000) };
  }

  writeFileSync(
    join(OUT, "publish-research.json"),
    JSON.stringify(
      {
        pageId,
        afterInsert,
        mutations: captured.slice(beforeMutations),
        pageModel: JSON.parse(pageJson),
        probe,
      },
      null,
      2,
    ),
  );
  console.log("saved publish-research.json, mutations:", captured.length - beforeMutations);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
