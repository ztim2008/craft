/**
 * E2E: snapshot insert Craftum Blocks.
 *
 * Режимы:
 *   npx tsx scripts/craftum-blocks-e2e-snapshot.ts           — расширение (headed)
 *   npx tsx scripts/craftum-blocks-e2e-snapshot.ts --inject    — page-world без MV3 (headless)
 *
 * Только site 954965. Требует CRAFTUM_EMAIL + CRAFTUM_PASSWORD в .env.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  REPO_ROOT,
  TEST_SITE_ID,
  createTestPage,
  fetchPageBlockCount,
  loadEnv,
  loadSnapshotBlock,
  loginCraftum,
  requireCraftumCredentials,
  waitForEditorWebpack,
} from "./lib/craftum-test-helpers";

const EXT_DIR = join(REPO_ROOT, "craftum-blocks-extension");
const OUT_DIR = join(REPO_ROOT, "docs/craftum-blocks-research/captured");
const INJECT_ONLY = process.argv.includes("--inject");
const BLOCK_ID = process.env.CRAFTUM_E2E_BLOCK_ID ?? "text-012222";

async function runInjectMode(): Promise<void> {
  const { email, password } = requireCraftumCredentials();
  const snapshot = loadSnapshotBlock(BLOCK_ID);
  const pageWorldSrc = readFileSync(join(EXT_DIR, "content/page-world.js"), "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ru-RU", viewport: { width: 1440, height: 900 } });

  await loginCraftum(page, email, password);
  const pageId = await createTestPage(page);
  const beforeCount = await fetchPageBlockCount(page, pageId);

  await page.goto(`https://craftum.com/app/site/${TEST_SITE_ID}/page/${pageId}?blank=true`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await waitForEditorWebpack(page);

  await page.addScriptTag({ content: pageWorldSrc });
  await page.waitForFunction(
    () => !!(window as { __craftumBlocksPageWorld?: boolean }).__craftumBlocksPageWorld,
    undefined,
    { timeout: 15_000 },
  );

  const snapJson = JSON.stringify(snapshot);
  const result = (await page.evaluate(`
    (function() {
      var snap = ${snapJson};
      var pid = ${pageId};
      return new Promise(function(resolve) {
        var reqId = crypto.randomUUID();
        var timer = setTimeout(function() { resolve({ error: "timeout" }); }, 90000);
        function onMsg(ev) {
          if (ev.source !== window || !ev.data || ev.data.type !== "CRAFTUM_BLOCKS_PAGE_RESULT") return;
          if (ev.data.id !== reqId) return;
          clearTimeout(timer);
          window.removeEventListener("message", onMsg);
          if (ev.data.error) resolve({ error: ev.data.error });
          else resolve(ev.data.result || {});
        }
        window.addEventListener("message", onMsg);
        window.postMessage({
          type: "CRAFTUM_BLOCKS_PAGE_CALL",
          id: reqId,
          method: "insertBlockSnapshot",
          args: { craftumBlock: snap, pageId: pid }
        }, "*");
      });
    })()
  `)) as { id?: string; error?: string } | undefined;

  if (!result?.id && result?.error) {
    throw new Error(`insertBlockSnapshot failed: ${result.error}`);
  }
  if (!result?.id) {
    throw new Error(`insertBlockSnapshot returned no id: ${JSON.stringify(result)}`);
  }

  const afterCount = await fetchPageBlockCount(page, pageId);
  const bodyText = await page.locator("body").innerText();

  const report = {
    mode: "inject",
    blockId: BLOCK_ID,
    pageId,
    beforeCount,
    afterCount,
    createdId: result.id,
    bodyHasHeading: /Заголовок/i.test(bodyText),
    ok: afterCount > beforeCount && !!result.id,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "e2e-snapshot-result.json"), JSON.stringify(report, null, 2));
  console.log("E2E inject:", report);

  await browser.close();
  if (!report.ok) process.exit(1);
}

async function runExtensionMode(): Promise<void> {
  const { email, password } = requireCraftumCredentials();
  mkdirSync(OUT_DIR, { recursive: true });
  const userDataDir = join(OUT_DIR, "pw-extension-profile-e2e");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    locale: "ru-RU",
    viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  });

  const page = context.pages()[0] || (await context.newPage());
  const logs: string[] = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("[Craftum Blocks]")) logs.push(t);
  });

  await loginCraftum(page, email, password);
  const pageId = await createTestPage(page);
  const beforeCount = await fetchPageBlockCount(page, pageId);

  await page.goto(`https://craftum.com/app/site/${TEST_SITE_ID}/page/${pageId}?blank=true`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await page.waitForFunction(
    () => {
      const panel = document.querySelector("#craftum-blocks-panel");
      return panel?.classList.contains("is-open") && panel.querySelectorAll(".craftum-blocks-card").length >= 4;
    },
    undefined,
    { timeout: 60_000 },
  );

  const cardCount = await page.locator(".craftum-blocks-card").count();
  const card = page.locator(".craftum-blocks-card").filter({ hasText: BLOCK_ID }).first();
  if (!(await card.count())) {
    throw new Error(`Block card «${BLOCK_ID}» not in panel (${cardCount} cards)`);
  }

  await card.click();
  await page.waitForFunction(
    () => {
      const toast = document.querySelector(".craftum-blocks-toast.ok");
      return toast && /Готово|вставлен/i.test(toast.textContent || "");
    },
    undefined,
    { timeout: 90_000 },
  ).catch(async () => {
    const errToast = await page.locator(".craftum-blocks-toast.error").first().textContent().catch(() => "");
    if (errToast) throw new Error(`Insert toast error: ${errToast}`);
    throw new Error("No success toast after insert");
  });

  await page.waitForTimeout(2000);
  const afterCount = await fetchPageBlockCount(page, pageId);
  const bodyText = await page.locator("body").innerText();

  const report = {
    mode: "extension",
    blockId: BLOCK_ID,
    pageId,
    beforeCount,
    afterCount,
    cardCount,
    bodyHasHeading: /Заголовок/i.test(bodyText),
    logs: logs.slice(-5),
    ok: afterCount > beforeCount,
  };

  writeFileSync(join(OUT_DIR, "e2e-snapshot-result.json"), JSON.stringify(report, null, 2));
  console.log("E2E extension:", report);

  await context.close();
  if (!report.ok) process.exit(1);
}

async function main(): Promise<void> {
  loadEnv();
  if (INJECT_ONLY) {
    await runInjectMode();
  } else {
    await runExtensionMode();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
