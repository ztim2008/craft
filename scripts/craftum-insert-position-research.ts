import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";

function loadEnv() {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i);
    if (!process.env[key]) process.env[key] = t.slice(i + 1);
  }
}

async function dumpStore(page: import("playwright").Page, label: string) {
  return page.evaluate((label) => {
    const app = document.querySelector("#app") as HTMLElement & {
      __vue_app__?: { config?: { globalProperties?: { $pinia?: { _s?: Map<string, unknown> } } } };
    };
    const pinia = app?.__vue_app__?.config?.globalProperties?.$pinia;
    const store = pinia?._s?.get("page") as
      | {
          $state: Record<string, unknown>;
          pageNodes?: Array<{ id: string; priority?: string; title?: string }>;
        }
      | undefined;
    if (!store) return { label, error: "no store" as const };
    const nodes = (store.pageNodes || store.$state.pageNodes || []) as Array<{
      id: string;
      priority?: string;
      title?: string;
    }>;
    return {
      label,
      newBlockOrderFrom: store.$state.newBlockOrderFrom ?? null,
      activeBlockId: store.$state.activeBlockId ?? null,
      showSelectBlockModal: store.$state.showSelectBlockModal ?? null,
      pageNodeCount: nodes.length,
      pageNodes: nodes.map((n) => ({ id: n.id, priority: n.priority, title: n.title })),
    };
  }, label);
}

async function main() {
  loadEnv();
  const email = process.env.CRAFTUM_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.CRAFTUM_PASSWORD;
  if (!email || !password) throw new Error("CRAFTUM_EMAIL + CRAFTUM_PASSWORD");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://craftum.com/login");
  await page.locator("input[type=email]").first().fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForURL(/craftum\.com\/app/, { timeout: 60000 });

  await page.goto("https://craftum.com/app/site/954965/page/1496963");
  await page.waitForSelector("section.cli-block", { timeout: 30000 });
  await page.waitForTimeout(3000);

  const before = await dumpStore(page, "before");

  await page.evaluate(() => {
    const chunk = (window as unknown as { webpackChunkeditor?: unknown[] }).webpackChunkeditor;
    if (!chunk) return;
    let mod: { c?: { createBlock?: (p: unknown) => Promise<unknown> } } | null = null;
    (chunk as unknown[]).push([
      ["craftum-insert-probe"],
      {},
      (req: (id: number) => typeof mod) => {
        mod = req(4163) as typeof mod;
      },
    ]);
    const api = mod?.c;
    if (!api?.createBlock) return;
    const orig = api.createBlock.bind(api);
    (window as unknown as { __lastCreatePayload?: unknown }).__lastCreatePayload = undefined;
    api.createBlock = async (payload: unknown) => {
      (window as unknown as { __lastCreatePayload?: unknown }).__lastCreatePayload = JSON.parse(
        JSON.stringify(payload),
      );
      return orig(payload);
    };
  });

  // Клик между двумя секциями
  const sections = page.locator("section.cli-block");
  const sectionCount = await sections.count();
  if (sectionCount >= 2) {
    const box1 = await sections.nth(0).boundingBox();
    const box2 = await sections.nth(1).boundingBox();
    if (box1 && box2) {
      const betweenY = box1.y + box1.height + (box2.y - (box1.y + box1.height)) / 2;
      await page.mouse.move(720, betweenY);
      await page.waitForTimeout(600);
      await page.mouse.click(720, betweenY);
      await page.waitForTimeout(1200);
    }
  }

  const afterBetweenClick = await dumpStore(page, "after-between-click");

  const domAdders = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll("button, [role='button'], .add-block, [class*='add']"),
    );
    return candidates
      .map((el, i) => {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const cls = (el.className || "").toString().slice(0, 120);
        const aria = el.getAttribute("aria-label") || "";
        if (rect.width <= 0 || rect.height <= 0) return null;
        if (!text && !aria && !/add|plus|block/i.test(cls)) return null;
        if (text.length > 40) return null;
        return { i, text, aria, cls, y: rect.y, tag: el.tagName };
      })
      .filter(Boolean)
      .slice(0, 40);
  });

  const plusInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")).filter((b) => {
      const t = b.textContent?.trim();
      return t === "+" || t === "＋";
    });
    return buttons.map((b, i) => {
      const rect = b.getBoundingClientRect();
      const section = b.closest("section.cli-block");
      return {
        i,
        y: rect.y,
        visible: rect.width > 0 && rect.height > 0,
        sectionId: section?.id || null,
        parentClass: b.parentElement?.className?.slice(0, 120) || null,
        grandParentClass: b.parentElement?.parentElement?.className?.slice(0, 120) || null,
      };
    });
  });

  // Показать кнопки «+» наведением на блоки
  for (let i = 0; i < sectionCount; i++) {
    await sections.nth(i).hover({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  const plusInfoAfterHover = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")).filter((b) => {
      const t = b.textContent?.trim();
      return t === "+" || t === "＋";
    });
    return buttons.map((b, i) => {
      const rect = b.getBoundingClientRect();
      return { i, y: rect.y, visible: rect.width > 0 && rect.height > 0 };
    });
  });

  let afterPlus = null;
  const plusCount = plusInfoAfterHover.filter((p) => p.visible).length || plusInfo.length;
  if (plusCount > 0) {
    const idx = Math.max(0, Math.floor(plusCount / 2) - 1);
    await page.evaluate((index) => {
      const buttons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const t = b.textContent?.trim();
        if (t !== "+" && t !== "＋") return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      buttons[index]?.click();
    }, idx);
    await page.waitForTimeout(1500);
    afterPlus = await dumpStore(page, "after-plus-click");
  }

  let afterTemplate: { lastPayload?: Record<string, unknown> } | null = null;
  const libOpen = await page.evaluate(() => {
    const lib = document.querySelector(".page__select-block, .select-block");
    if (!lib) return false;
    const r = lib.getBoundingClientRect();
    return r.width > 80;
  });
  if (libOpen) {
    await page.locator(".select-block-card").first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(3000);
    afterTemplate = await page.evaluate(() => ({
      lastPayload: (window as unknown as { __lastCreatePayload?: Record<string, unknown> })
        .__lastCreatePayload,
    }));
  }

  const result = { before, afterBetweenClick, domAdders, plusInfo, plusInfoAfterHover, afterPlus, afterTemplate };
  writeFileSync("/tmp/craftum-insert-research.json", JSON.stringify(result, null, 2));

  console.log("before:", JSON.stringify(before, null, 2));
  console.log("after between click:", JSON.stringify(afterBetweenClick, null, 2));
  console.log("plus buttons:", plusInfo.length, "after hover:", plusInfoAfterHover.length);
  if (afterPlus && !("error" in afterPlus)) {
    console.log("after plus:", JSON.stringify(afterPlus, null, 2));
    console.log("newBlockOrderFrom changed:", before.newBlockOrderFrom, "->", afterPlus.newBlockOrderFrom);
  }
  if (afterTemplate?.lastPayload) {
    console.log("createBlock priority:", afterTemplate.lastPayload.priority);
    console.log(JSON.stringify(afterTemplate.lastPayload, null, 2).slice(0, 2500));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
