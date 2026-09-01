import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, "../.env"), "utf8");
    for (const line of raw.split("\n")) {
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

async function main() {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD!;
  const out = join(__dirname, "../docs/craftum-blocks-research/captured");
  mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://craftum.com/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Войти")').first().click();
  await page.waitForTimeout(4000);
  await page.goto("https://craftum.com/app/site/954965/page/1496894", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(10000);

  const info = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll("*")]
      .filter((el) => {
        const s = getComputedStyle(el);
        if (s.position !== "fixed" && s.position !== "sticky") return false;
        const r = el.getBoundingClientRect();
        return r.width > 24 && r.height > 24 && r.right > innerWidth - 150 && r.bottom > innerHeight - 150;
      })
      .slice(0, 15)
      .map((el) => ({
        tag: el.tagName,
        id: el.id,
        cls: String(el.className).slice(0, 70),
        z: getComputedStyle(el).zIndex,
        r: Math.round(el.getBoundingClientRect().right),
        b: Math.round(el.getBoundingClientRect().bottom),
      }));
    return {
      url: location.href,
      iframes: document.querySelectorAll("iframe").length,
      bodyKids: document.body?.children?.length,
      fixed,
    };
  });

  writeFileSync(join(out, "debug-1496894.json"), JSON.stringify(info, null, 2));
  await page.screenshot({ path: join(out, "debug-1496894.png") });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

main();
