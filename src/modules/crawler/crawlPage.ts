import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "playwright";
import { assertPublicHttpUrl } from "@/modules/security/urlGuard";
import { attachNetworkCapture } from "./captureNetwork";
import { captureScreenshot } from "./captureScreenshot";
import { discoverLinks } from "./discoverLinks";
import { scrollPage } from "./scrollPage";
import { CRAWL_LIMITS, type CrawlPageResult, type NetworkEntry } from "./types";

function metaContent(html: string, name: string): string | null {
  const double = html.match(
    new RegExp(`name=["']${name}["']\\s+content=["']([^"']+)["']`, "i"),
  );
  if (double?.[1]) return double[1];
  const swapped = html.match(
    new RegExp(`content=["']([^"']+)["']\\s+name=["']${name}["']`, "i"),
  );
  return swapped?.[1] ?? null;
}

export async function crawlPage(
  browser: Browser,
  url: string,
  outputDir: string,
): Promise<CrawlPageResult> {
  await assertPublicHttpUrl(url);
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; KraftumMigrationEngine/0.1; +https://craft.nordic-builder.ru)",
    locale: "ru-RU",
    ignoreHTTPSErrors: false,
  });
  context.setDefaultTimeout(CRAWL_LIMITS.navigationTimeoutMs);
  context.setDefaultNavigationTimeout(CRAWL_LIMITS.navigationTimeoutMs);

  const page = await context.newPage();
  const network: NetworkEntry[] = [];
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  attachNetworkCapture(page, network);

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  let status: number | null = null;
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: CRAWL_LIMITS.navigationTimeoutMs,
    });
    status = response?.status() ?? null;
    await assertPublicHttpUrl(page.url());

    try {
      await page.waitForLoadState("load", { timeout: 8_000 });
    } catch {
      // pages with long-lived connections should not block crawl
    }

    await scrollPage(page);
    await mkdir(outputDir, { recursive: true });

    const html = await page.content();
    if (Buffer.byteLength(html, "utf8") > CRAWL_LIMITS.maxHtmlBytes) {
      throw new Error("HTML страницы превышает лимит размера");
    }

    const htmlFile = path.join(outputDir, "index.html");
    const screenshotFile = path.join(outputDir, "screenshot.png");
    await writeFile(htmlFile, html, "utf8");
    await captureScreenshot(page, screenshotFile);

    const hrefs = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => a.getAttribute("href") || ""),
    );
    const finalUrl = page.url();
    const parsed = new URL(finalUrl);

    return {
      html,
      snapshot: {
        url,
        finalUrl,
        path: parsed.pathname || "/",
        title: await page.title(),
        status,
        htmlFile,
        screenshotFile,
        links: discoverLinks(finalUrl, hrefs),
        network,
        consoleErrors: consoleErrors.slice(0, 50),
        httpErrors: httpErrors.slice(0, 50),
        generator: metaContent(html, "generator"),
        websiteId: metaContent(html, "website_id"),
        pageId: metaContent(html, "page_id"),
      },
    };
  } finally {
    await context.close();
  }
}
