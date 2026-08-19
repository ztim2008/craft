import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";

export async function captureScreenshot(
  page: Page,
  filePath: string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await page.screenshot({
    path: filePath,
    fullPage: true,
    timeout: 15_000,
  });
}
