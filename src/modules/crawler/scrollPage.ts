import type { Page } from "playwright";
import { CRAWL_LIMITS } from "./types";

export async function scrollPage(page: Page): Promise<void> {
  const started = Date.now();
  for (let step = 0; step < CRAWL_LIMITS.maxScrollSteps; step += 1) {
    if (Date.now() - started > CRAWL_LIMITS.maxScrollTimeMs) break;
    const atBottom = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, Math.max(window.innerHeight * 0.9, 600));
      const doc = document.documentElement;
      return (
        window.scrollY === before ||
        window.innerHeight + window.scrollY >= doc.scrollHeight - 4
      );
    });
    await new Promise((resolve) => setTimeout(resolve, CRAWL_LIMITS.scrollIntervalMs));
    if (atBottom) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
