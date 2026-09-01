import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Page } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, "../..");
export const TEST_SITE_ID = 954965;
export const PROTECTED_SITE_IDS = new Set([954959]);

export type CraftumBlockSnapshot = {
  id: string;
  priority: string;
  title: string;
  content: unknown;
  slug_id?: number;
  slug?: unknown;
  fonts?: unknown[];
  bind?: unknown;
};

export function loadEnv(): void {
  try {
    const raw = readFileSync(join(REPO_ROOT, ".env"), "utf8");
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
    /* optional .env */
  }
}

export function requireCraftumCredentials(): { email: string; password: string } {
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) {
    throw new Error("CRAFTUM_EMAIL + CRAFTUM_PASSWORD required in .env");
  }
  return { email, password };
}

export function loadSnapshotBlock(blockId = "text-012222"): CraftumBlockSnapshot {
  const catalog = JSON.parse(
    readFileSync(join(REPO_ROOT, "data/craftum-blocks/catalog.json"), "utf8"),
  ) as {
    blocks: Array<{ id: string; insert?: { craftumBlock?: CraftumBlockSnapshot } }>;
  };
  const block = catalog.blocks.find((b) => b.id === blockId);
  const snap = block?.insert?.craftumBlock;
  if (!snap) throw new Error(`Snapshot block «${blockId}» not in catalog.json`);
  return snap;
}

export async function loginCraftum(page: Page, email: string, password: string): Promise<void> {
  await page.goto("https://craftum.com/login", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Войти")').first().click();
  await page.waitForTimeout(4000);
}

export async function createTestPage(page: Page, siteId = TEST_SITE_ID): Promise<number> {
  if (PROTECTED_SITE_IDS.has(siteId)) {
    throw new Error(`Refusing to use protected site_id ${siteId}`);
  }
  const res = await page.request.post("https://api-v2.craftum.com/pages/", {
    data: { website_id: siteId },
  });
  if (!res.ok()) throw new Error(`POST /pages/ failed: ${res.status()}`);
  const { id } = (await res.json()) as { id: number };
  return id;
}

export async function fetchPageBlockCount(page: Page, pageId: number): Promise<number> {
  const res = await page.request.get(
    `https://api-v2.craftum.com/blocks/blocks/?page_id=${pageId}`,
  );
  if (!res.ok()) throw new Error(`GET blocks failed: ${res.status()}`);
  const blocks = (await res.json()) as unknown[];
  return blocks.length;
}

export async function waitForEditorWebpack(page: Page, timeoutMs = 45_000): Promise<void> {
  await page.waitForFunction(
    () => !!(window as unknown as { webpackChunkeditor?: unknown }).webpackChunkeditor,
    undefined,
    { timeout: timeoutMs },
  );
}
